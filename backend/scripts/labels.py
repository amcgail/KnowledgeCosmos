
import psycopg2
import json
import numpy as np
from tqdm import tqdm

conn = psycopg2.connect("dbname=MAG user=postgres password=mcgail port=5433")

# Create indices on pos_x, pos_y, pos_z if they don't exist
cur = conn.cursor()
cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_pos_x ON papers(pos_x);
    CREATE INDEX IF NOT EXISTS idx_pos_y ON papers(pos_y);
    CREATE INDEX IF NOT EXISTS idx_pos_z ON papers(pos_z);
""",)

# Get the bounding box of the data
cur = conn.cursor()
cur.execute("""
    SELECT min(pos_x), max(pos_x), min(pos_y), max(pos_y), min(pos_z), max(pos_z) FROM papers
""",)
res = cur.fetchall()
cur.close()
x_min, x_max, y_min, y_max, z_min, z_max = res[0]

voxels = 10
delt_x = (x_max - x_min) / voxels
delt_y = (y_max - y_min) / voxels
delt_z = (z_max - z_min) / voxels

topics = []

def xyz_iterator():
  for x in np.linspace(x_min, x_max, voxels, endpoint=False):
      for y in np.linspace(y_min, y_max, voxels, endpoint=False):
          for z in np.linspace(z_min, z_max, voxels, endpoint=False):
              yield x, y, z

from openai import OpenAI
gpt = OpenAI(api_key="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")
def gpt_query(q):
   # simple chat completion
   # with a user message with content q

   res = gpt.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": q}],
   )
   return res.choices[0].message.content

done = 0

def voxel_inspect(
      x_start, x_end,
      y_start, y_end,
      z_start, z_end,
):
  
  (x_start, x_end, y_start, y_end, z_start, z_end) = map(float, (
    x_start, x_end,
    y_start, y_end,
    z_start, z_end,
  ))
   
  cur = conn.cursor()
  cur.execute("""
      SELECT info_json FROM papers
      WHERE %s < pos_x AND pos_x < %s AND %s < pos_y AND pos_y < %s AND %s < pos_z AND pos_z < %s
      ORDER BY random()
      LIMIT 15
  """, (
      x_start, x_end,
      y_start, y_end,
      z_start, z_end,
  ),)

  res = cur.fetchall()
  cur.close()

  infos = [x[0] for x in res]
  infos = [json.loads(x) for x in infos]

  if len(infos) < 15:
      return

  titles = "\n".join([x['title'] for x in infos])

  print(count, titles)

  q = f"""
Look at the following paper titles.
What is the most specific topic which applies to all of these papers?
Use capitalization and punctuation as appropriate.
If the papers are too diverse, and don't fit under a single topic, respond simply with "diverse".
  """

  a = gpt_query(q + '\n' + titles)

  if a.strip('. ').lower() == "diverse":
      print('SUBDIVIDING')
      # subdivide the voxel and try again
      for x in np.linspace(x_start, x_end, 2, endpoint=False):
          for y in np.linspace(y_start, y_end, 2, endpoint=False):
              for z in np.linspace(z_start, z_end, 2, endpoint=False):
                  voxel_inspect(x, x+delt_x/2, y, y+delt_y/2, z, z+delt_z/2)
  
  else:
      print('TOPIC:', a)
      topics.append({
          'x_start': x_start,
          'y_start': y_start,
          'z_start': z_start,
          'x_end': x_end,
          'y_end': y_end,
          'z_end': z_end,
          'topic': a
      })

for x, y, z in tqdm(xyz_iterator()):
  (x,y,z) = map(float, (x,y,z))
  cur = conn.cursor()

  cur.execute("""
      SELECT count(*) FROM papers
      WHERE %s < pos_x AND pos_x < %s AND %s < pos_y AND pos_y < %s AND %s < pos_z AND pos_z < %s
  """, (
      x, x+delt_x,
      y, y+delt_y,
      z, z+delt_z,
  ),)

  res = cur.fetchall()
  cur.close()

  count = res[0][0]
  if count > 50:
      voxel_inspect(x, x+delt_x, y, y+delt_y, z, z+delt_z)

      done += 1
      if done > 20:
          break
      
print(topics)