#!/usr/bin/env python
import flask
from flask import g, request
import time
import csv
import numpy as np

import ols
from utils import json_float
import settings

app = flask.Flask(__name__)


def add_time_to_global():
    g.time = settings.ASSET_TIME

app.before_request(add_time_to_global)

@app.route("/demo")
def demo():
    return flask.render_template("demo.html")

@app.route("/demo_scatter.js")
def scatter():
    points = np.random.randint(50, 200)
    er_sd = np.random.uniform(5, 50)
    b0 = np.random.uniform(-20, 20)
    b1 = np.random.uniform(-20, 20)
    x = np.random.normal(loc=np.random.uniform(-10, 10), scale=100, size=points)
    y = (b0*np.ones(points))+(b1*x)
    err = np.random.normal(loc=0, scale=100, size=points)
    y += err
    
    params = {
        'n' : points,
        'b0' : b0,
        'b1' : b1,
        'err': err.tolist()
    }
    
    points = np.column_stack((x,y)).tolist()
    r = ols.ols(y, np.column_stack((np.ones_like(x), x)), 'y', ['const', 'x'])
    regression_data = {
        'b' : r.b.tolist(),
        't' : r.t.tolist(),
        'p' : r.p.tolist()
    }
    
    return flask.jsonify(params=params, points=points, result=regression_data)

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/d", methods=["POST"])
def upload():
    import hashlib
    file_raw = request.files['csvfile']
    lines = file_raw.read().splitlines()
    dialect = csv.Sniffer().sniff("\n".join(lines[0:5]))
    reader = csv.reader(lines, dialect=dialect)
    h = hashlib.md5()
    rows = list(reader)
    h.update(str(rows))
    filename = "%s.csv" % (h.hexdigest())
    with open("%s/%s" % (settings.STORAGE_DIR, filename), 'w') as outfile:
        writer = csv.writer(outfile, dialect="excel")
        writer.writerows(rows)
    g.filename = filename
    g.rows = rows
    return flask.render_template("uploaded.html")

@app.route("/d/<filehash>")
def scatter_frame(filehash):
    rows = []
    with open("%s/%s.csv" % (settings.STORAGE_DIR, filehash), 'rt') as csvfile:
        reader = csv.reader(csvfile, dialect="excel")
        rows = list(reader)
    g.column_names = rows[0]
    g.rows = rows
    g.filehash = filehash
    
    return flask.render_template("scatter_frame.html")

@app.route("/d/<filehash>/regress.js")
def regress_js(filehash):
    filename = "%s/%s.csv" % (settings.STORAGE_DIR, filehash)
    with open(filename, 'rt') as csvfile:
        reader = csv.reader(csvfile, dialect="excel")
        headers = reader.next()
        csvfile.seek(0)
        datas = np.genfromtxt(csvfile, delimiter=",", skip_header=1)
    
    app.logger.debug(request.args)
    x_idx = int(request.args.get("x", 0))
    y_idx = int(request.args.get("y", 0))
    nuis_idxs = []
    nlist = request.args.get("n", "").strip()
    if nlist != "":
        nuis_idxs = [int(i) for i in nlist.split(",")]
    app.logger.debug(x_idx)
    
    yvals = datas[:,y_idx]
    const_term = np.ones_like(yvals)
    x_var = datas[:,x_idx]
    nuisance_vars = datas[:,nuis_idxs]
    
    mA = np.column_stack((const_term, x_var, nuisance_vars))
    result = ols.ols(yvals, mA, 'y', ['const', 'x'])
    
    coef_result = {
        "const": {
            'b'  : json_float(result.b[0]),
            't'  : json_float(result.t[0]),
            'p'  : json_float(result.p[0]),
            'se' : json_float(result.se[0])
        },
        "x": {
            'b'  : json_float(result.b[1]),
            't'  : json_float(result.t[1]),
            'p'  : json_float(result.p[1]),
            'se' : json_float(result.se[1])
        }
    }
    
    for i, col_idx in enumerate(nuis_idxs):
        res_i = i+2
        coef_result["n_%s" % col_idx] = {
            'b'  : json_float(result.b[res_i]),
            't'  : json_float(result.t[res_i]),
            'p'  : json_float(result.p[res_i]),
            'se' : json_float(result.se[res_i])
        }
    
    model_result = {
        "Rsq"    : json_float(result.R2),
        "RsqAdj" : json_float(result.R2adj),
        "F"      : json_float(result.F),
        "Fpv"    : json_float(result.Fpv)
    }
    points = np.column_stack((x_var, yvals)).tolist()
    return flask.jsonify(points=points, 
        coef_result=coef_result, model_result=model_result)
    
if __name__ == "__main__":
    app.debug = True
    app.run()