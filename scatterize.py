#!/usr/bin/env python
import flask
from flask import g, request
import time
import csv
import numpy as np
from scikits.statsmodels import api as sm

from utils import json_float, add_url_helpers
import wsgi_utils
import settings

app = flask.Flask(__name__, settings.STATIC_PATH)
app.wsgi_app = wsgi_utils.ReverseProxied(app.wsgi_app)

add_url_helpers(app)

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
    
@app.route("/about")
def about():
    return flask.render_template("about.html")

@app.route("/save_svg", methods=["GET", "POST"])
def save_svg():
    preamble = """<?xml version="1.0" standalone="no"?>

<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
"""
    svgdata = request.form.get("svg_data", "")
    response = flask.make_response(preamble+svgdata)
    response.headers["Content-Disposition"] = "attachment; filename=plot.svg"
    return response

@app.route("/d", methods=["POST"])
def upload():
    import hashlib
    file_raw = request.files['csvfile']
    lines = file_raw.read().splitlines()
    dialect = csv.Sniffer().sniff("\n".join(lines[0:settings.SNIFF_LINES]))
    reader = csv.reader(lines, dialect=dialect)
    h = hashlib.sha1()
    rows = list(reader)
    h.update(str(rows))
    short_hash = h.hexdigest()[0:settings.HASH_PREFIX_CHARS]
    filename = "%s.csv" % (short_hash)
    with open("%s/%s" % (settings.STORAGE_DIR, filename), 'w') as outfile:
        writer = csv.writer(outfile, dialect="excel")
        writer.writerows(rows)
    g.filename = filename
    g.rows = rows
    return flask.redirect(flask.url_for('scatter_frame', filehash=short_hash))

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
        columns = reader.next()
        csvfile.seek(0)
        datas = np.genfromtxt(csvfile, delimiter=",", skip_header=1)
    
    x_idx = int(request.args.get("x", 0))
    y_idx = int(request.args.get("y", 0))
    nuis_idxs = []
    nlist = request.args.get("n", "").strip()
    if nlist != "":
        nuis_idxs = [int(i) for i in nlist.split(",")]
    
    censor_idxs = []    
    clist = request.args.get("c", "").strip()
    if clist != "":
        censor_idxs = [int(i) for i in clist.split(",")]
    
    needed_cols = [y_idx, x_idx] + nuis_idxs;
    needed_data = datas[:,needed_cols]
    data_present = np.isfinite(needed_data)
    good_rows = np.all(data_present, axis=1)
    filtered_data = datas[good_rows]
    
    dv = filtered_data[:,y_idx]
    const_term = np.ones_like(dv)
    x_var = filtered_data[:,x_idx]
    nuisance_vars = filtered_data[:,nuis_idxs]
    weights = np.ones_like(dv).astype(np.int)
    weights[censor_idxs] = 0;
    
    mA = np.column_stack((const_term, x_var, nuisance_vars))
    mA_masked = mA[weights.astype(bool)]
    dv_masked = dv[weights.astype(bool)]
    plot_result = sm.OLS(dv, mA).fit()
    result = sm.OLS(dv_masked, mA_masked).fit()
    plot_yvals = plot_result.params[0] + (plot_result.params[1]*x_var) + plot_result.resid
    
    coef_result = {
        "const": {
            'b'  : json_float(result.params[0]),
            't'  : json_float(result.tvalues[0]),
            'p'  : json_float(result.pvalues[0]),
            'se' : json_float(result.bse[0]),
            'col_idx' : None,
            'name' : "Constant"
        },
        "x": {
            'b'  : json_float(result.params[1]),
            't'  : json_float(result.tvalues[1]),
            'p'  : json_float(result.pvalues[1]),
            'se' : json_float(result.bse[1]),
            'col_idx' : x_idx,
            'name' : columns[x_idx]
        }
    }
    
    for i, col_idx in enumerate(nuis_idxs):
        res_i = i+2
        coef_result["n_%s" % col_idx] = {
            'b'  : json_float(result.params[res_i]),
            't'  : json_float(result.tvalues[res_i]),
            'p'  : json_float(result.pvalues[res_i]),
            'se' : json_float(result.bse[res_i]),
            'col_idx' : col_idx,
            'name' : columns[col_idx]
        }
    
    model_result = {
        "Rsq"    : json_float(result.rsquared),
        "RsqAdj" : json_float(result.rsquared_adj),
        "F"      : json_float(result.fvalue),
        "Fpv"    : json_float(result.f_pvalue)
    }
    points = np.column_stack((x_var, plot_yvals, weights)).tolist()
    return flask.jsonify(points=points, 
        coef_result=coef_result, model_result=model_result)
    
if __name__ == "__main__":
    app.debug = True
    app.run()