"""
Topic labeling system for 3D paper visualization.

This module provides functionality for automatically labeling regions of the 3D space
based on paper topics using GPT and spatial clustering.
"""

__all__ = [
    'TopicLabeler'
]

import psycopg2
import json
import numpy as np
from tqdm import tqdm
from typing import List, Dict, Tuple, Optional
from openai import OpenAI

class TopicLabeler:
    """Handles the generation of topic labels for regions in 3D space."""

    def __init__(self, db_config: str = "dbname=MAG user=postgres password=mcgail port=5433"):
        """
        Initialize the TopicLabeler.

        Args:
            db_config: Database connection string
        """
        self.db_config = db_config
        self.conn = None
        self.topics = []
        self.bounds = None
        self.voxels = 10
        self.gpt = None

    def connect(self) -> None:
        """Establish database connection and create necessary indices."""
        if self.conn is None:
            self.conn = psycopg2.connect(self.db_config)
            cur = self.conn.cursor()
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_pos_x ON papers(pos_x);
                CREATE INDEX IF NOT EXISTS idx_pos_y ON papers(pos_y);
                CREATE INDEX IF NOT EXISTS idx_pos_z ON papers(pos_z);
            """)
            self.conn.commit()
            cur.close()

    def initialize_gpt(self, api_key: str) -> None:
        """
        Initialize the GPT client.

        Args:
            api_key: OpenAI API key
        """
        self.gpt = OpenAI(api_key=api_key)

    def get_bounds(self) -> Tuple[float, float, float, float, float, float]:
        """
        Get the bounding box of all papers in the space.

        Returns:
            Tuple of (x_min, x_max, y_min, y_max, z_min, z_max)
        """
        if self.bounds is None:
            self.connect()
            cur = self.conn.cursor()
            cur.execute("""
                SELECT min(pos_x), max(pos_x), min(pos_y), max(pos_y), min(pos_z), max(pos_z) 
                FROM papers
            """)
            res = cur.fetchone()
            cur.close()
            self.bounds = res
        return self.bounds

    def xyz_iterator(self) -> Tuple[float, float, float]:
        """
        Iterator over voxel starting positions.

        Yields:
            Tuple of (x, y, z) coordinates
        """
        x_min, x_max, y_min, y_max, z_min, z_max = self.get_bounds()
        for x in np.linspace(x_min, x_max, self.voxels, endpoint=False):
            for y in np.linspace(y_min, y_max, self.voxels, endpoint=False):
                for z in np.linspace(z_min, z_max, self.voxels, endpoint=False):
                    yield x, y, z

    def gpt_query(self, query: str) -> str:
        """
        Query GPT for topic labeling.

        Args:
            query: The query string to send to GPT

        Returns:
            GPT's response
        """
        if self.gpt is None:
            raise ValueError("GPT client not initialized. Call initialize_gpt first.")
            
        res = self.gpt.chat.completions.create(
            model="gpt-4-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": query}
            ],
        )
        return res.choices[0].message.content

    def voxel_inspect(
        self,
        x_start: float,
        x_end: float,
        y_start: float,
        y_end: float,
        z_start: float,
        z_end: float,
    ) -> None:
        """
        Inspect a voxel and determine its topic.

        Args:
            x_start: Start of x range
            x_end: End of x range
            y_start: Start of y range
            y_end: End of y range
            z_start: Start of z range
            z_end: End of z range
        """
        self.connect()
        cur = self.conn.cursor()
        cur.execute("""
            SELECT info_json FROM papers
            WHERE %s < pos_x AND pos_x < %s 
            AND %s < pos_y AND pos_y < %s 
            AND %s < pos_z AND pos_z < %s
            ORDER BY random()
            LIMIT 15
        """, (x_start, x_end, y_start, y_end, z_start, z_end))
        
        res = cur.fetchall()
        cur.close()

        if len(res) < 15:
            return

        infos = [json.loads(x[0]) for x in res]
        titles = "\n".join(info['title'] for info in infos)

        query = """
        Look at the following paper titles.
        What is the most specific topic which applies to all of these papers?
        Use capitalization and punctuation as appropriate.
        If the papers are too diverse, and don't fit under a single topic, respond simply with "diverse".
        """

        response = self.gpt_query(query + '\n' + titles)

        if response.strip('. ').lower() == "diverse":
            # Subdivide the voxel
            dx = (x_end - x_start) / 2
            dy = (y_end - y_start) / 2
            dz = (z_end - z_start) / 2
            
            for x in np.linspace(x_start, x_end, 2, endpoint=False):
                for y in np.linspace(y_start, y_end, 2, endpoint=False):
                    for z in np.linspace(z_start, z_end, 2, endpoint=False):
                        self.voxel_inspect(x, x+dx, y, y+dy, z, z+dz)
        else:
            self.topics.append({
                'x_start': x_start,
                'y_start': y_start,
                'z_start': z_start,
                'x_end': x_end,
                'y_end': y_end,
                'z_end': z_end,
                'topic': response
            })

    def generate_labels(self, max_regions: int = 20) -> List[Dict]:
        """
        Generate topic labels for regions in the 3D space.

        Args:
            max_regions: Maximum number of regions to label

        Returns:
            List of dictionaries containing region bounds and topics
        """
        x_min, x_max, y_min, y_max, z_min, z_max = self.get_bounds()
        dx = (x_max - x_min) / self.voxels
        dy = (y_max - y_min) / self.voxels
        dz = (z_max - z_min) / self.voxels

        done = 0
        for x, y, z in tqdm(self.xyz_iterator()):
            cur = self.conn.cursor()
            cur.execute("""
                SELECT count(*) FROM papers
                WHERE %s < pos_x AND pos_x < %s 
                AND %s < pos_y AND pos_y < %s 
                AND %s < pos_z AND pos_z < %s
            """, (x, x+dx, y, y+dy, z, z+dz))
            
            count = cur.fetchone()[0]
            cur.close()

            if count > 50:
                self.voxel_inspect(x, x+dx, y, y+dy, z, z+dz)
                done += 1
                if done >= max_regions:
                    break

        return self.topics