import numpy as np

def json_float(val):
    if np.isnan(val) or np.isinf(val):
        return str(val)
    return val