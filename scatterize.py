#!/usr/bin/env python
import flask
import time
import ols

import numpy as np

app = flask.Flask(__name__)

ASSET_TIME = int(time.time())

def add_time_to_global():
    flask.g.time = ASSET_TIME

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
    x = np.linspace(0, 50, num=points)
    y = b0*np.ones(points)+b1*x+np.random.uniform(0, er_sd, points)
    
    params = {
        'n' : points,
        'er_sd': er_sd,
        'b0' : b0,
        'b1' : b1
    }
    
    points = np.column_stack((x,y)).tolist()
    return flask.jsonify(params=params, points=points)

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/g/<filehash>")
def show_thing(f):
    pass
        
if __name__ == "__main__":
    app.debug = True
    app.run()