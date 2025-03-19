from flask import Flask, request

import psycopg2
from flask_cors import CORS, cross_origin

conn = psycopg2.connect("dbname=MAG user=postgres password=mcgail port=5433")

app = Flask(__name__)

import flask
import json

import pickle
from pathlib import Path
import requests

from scripts import fields

# Load the field data using the proper functions
fnames = fields.GetFieldNames()
top_level = fields.GetTopLevel()
subgs = fields.GetSubFields()

fnamesr = {x:y for y,x in fnames.items()}

@app.route("/subgroups", methods=['GET'])
def subgroup():
    a = dict(request.args)
    if 'of' not in a:
        ret = top_level
    else:
        ret = [ fnames[x] for x in subgs[ fnamesr[a['of']] ] ]

    
    response = flask.Response(json.dumps(ret))
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/location", methods=['GET'])
def loc():
    a = dict(request.args)
    x = float(a['x']) / 100
    y = float(a['y']) / 100
    z = float(a['z']) / 100
    delt = float(a['delt']) / 100
    
    cur = conn.cursor()

    cur.execute("""
        SELECT pos_x,pos_y,pos_z,info_json FROM papers
        WHERE %s < pos_x AND pos_x < %s AND %s < pos_y AND pos_y < %s AND %s < pos_z AND pos_z < %s
    """, (
        x-delt/2, x+delt/2,
        y-delt/2, y+delt/2,
        z-delt/2, z+delt/2,
    ),)

    res = cur.fetchall()
    cur.close()

    res = [
        dict(zip(['x','y','z','js'], r))
        for r in res
    ]

    # annoying arbitrary scale factor
    for r in res:
        for k in 'xyz':
            r[k] = r[k]*100

    print(res)

    [ x.update({'js':json.loads(x['js'])}) for x in res ]
    response = flask.Response(json.dumps(res))
    response.headers.add('Access-Control-Allow-Origin', '*')

    return response

def s2info_extract(doc):
    out_doc = {}
    out_doc['abstract'] = doc.get('abstract', 'No abstract available')
    out_doc['authors'] = [x['name'] for x in doc.get('authors', [])]
    out_doc['fields'] = [x['category'] for x in doc.get('s2FieldsOfStudy', [])]    
    out_doc['fields'] = list(set(out_doc['fields']))
    return out_doc

@app.route("/paper", methods=['GET'])
def paper():
    a = dict(request.args)
    
    cur = conn.cursor()
    cur.execute("""
    SELECT info_json, s2info_json FROM papers
    WHERE mag_id = %s
    """, (int(a['id']),))

    res = cur.fetchall()
    cur.close()

    if not len(res):
        response = flask.Response('0')
        return response

    paper_info = json.loads(res[0][0])
    s2_info = res[0][1]

    if not s2_info:
        s2_url = f'https://api.semanticscholar.org/v1/paper/MAG:{a["id"]}'
        s2_response = requests.get(s2_url)
        s2_response = s2_response.json()
        s2_info = s2info_extract(s2_response)
        cur = conn.cursor()
        # update papers
        cur.execute("""
            UPDATE papers
            SET s2info_json = %s
            WHERE mag_id = %s
        """, (json.dumps(s2_info), int(a['id']),))
        conn.commit()
        cur.close()
        
        paper_info.update(s2_info)

    else:
        s2_info = json.loads(s2_info)
        paper_info.update(s2_info)
        
    response = flask.Response(json.dumps(paper_info))
    response.headers.add('Access-Control-Allow-Origin', '*')

    return response

@app.route("/citations", methods=['GET'])
def citations():
    a = dict(request.args)
    
    cur = conn.cursor()
    cur.execute("""
    SELECT out FROM citations
    WHERE mag_id = %s
    """, (int(a['id']),))

    res = cur.fetchall()
    cur.close()

    if not len(res):
        response = flask.Response('0')
    else:
        response = flask.Response(res[0])

    response.headers.add('Access-Control-Allow-Origin', '*')

    return response

app.run(debug=True, port=1235)