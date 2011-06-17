from utils import json_float
import numpy as np
import scikits.statsmodels.api as sm

class StatsRunner(object):
    """The thing you'll use to actually run your statistics."""
    def __init__(self, data_ar, column_names, dv_idx, iv_idx, nuis_idxs, 
            censor_rows, model="OLS", model_options={}):
        super(StatsRunner, self).__init__()
        self.data_ar = data_ar
        self.column_names = column_names
        self.dv_idx = dv_idx
        self.iv_idx = iv_idx
        self.nuis_idxs = nuis_idxs
        self.censor_rows = censor_rows
        self.model = model
        self.model_options = model_options
    
    def run(self):
        model_types = {
            'OLS' : {
                'model_fx' : self._run_ols,
                'json_fx'  : self._jsonify_ols
            }
        }
        
        modeled_idxs = [self.dv_idx, self.iv_idx] + self.nuis_idxs
        modeled_data = self.data_ar[:,modeled_idxs]
        possible_rows = np.all(np.isfinite(modeled_data), axis=1) # A mask!
        filtered_data = self.data_ar[possible_rows]
        # The UI forces our censor_rows to be relative to possible_rows.
        
        dv = filtered_data[:,self.dv_idx]
        const_term = np.ones_like(dv)
        iv = filtered_data[:,self.iv_idx]
        nuisance_v = filtered_data[:,self.nuis_idxs]
        weights = np.ones_like(dv).astype(np.int)
        weights[self.censor_rows] = 0
        censor_ar = np.zeros((len(weights), len(self.censor_rows)))
        for i, r in enumerate(self.censor_rows):
            censor_ar[rownum][i] = 1.
        X = np.column_stack((const_term, iv, nuisance_v, censor_ar))
        
        self.result = model_types[self.model]['model_fx'](dv, X)
        result = self.result
        # This is ugly! Must refactor.
        if (self.model == "RLM"):
            weights = result.weights
        
        plot_yvals = result.params[0]+(result.params[1]*iv)+result.resid
        self.points = np.column_stack((iv, plot_yvals, weights))
        
        return model_types[self.model]['json_fx'](self.result, self.points)
        
    def _run_ols(self, endog, exog):
        return sm.OLS(endog, exog).fit()
        
    def _jsonify_ols(self, model_result, points):
        mr = model_result
        coef_result = {}
        coef_result['const'] = {
            'b'         : json_float(mr.params[0]),
            't'         : json_float(mr.tvalues[0]),
            'p'         : json_float(mr.pvalues[0]),
            'se'        : json_float(mr.bse[0]),
            'col_idx'   : None,
            'name'      : "Constant"
        }
        
        coef_result['x'] = {
            'b'         : json_float(mr.params[1]),
            't'         : json_float(mr.tvalues[1]),
            'p'         : json_float(mr.pvalues[1]),
            'se'        : json_float(mr.bse[1]),
            'col_idx'   : self.iv_idx,
            'name'      : self.column_names[self.iv_idx]
        }
        
        for i, col_idx in enumerate(self.nuis_idxs):
            res_i = i+2
            coef_result["n_%s" % col_idx] = {
                'b'  : json_float(mr.params[res_i]),
                't'  : json_float(mr.tvalues[res_i]),
                'p'  : json_float(mr.pvalues[res_i]),
                'se' : json_float(mr.bse[res_i]),
                'col_idx' : col_idx,
                'name' : self.column_names[col_idx]
            }
        
        model_result = {
            "Rsq"    : json_float(mr.rsquared),
            "RsqAdj" : json_float(mr.rsquared_adj),
            "F"      : json_float(mr.fvalue),
            "Fpv"    : json_float(mr.f_pvalue)
        }
        
        return dict(points=points.tolist(), coef_result=coef_result, 
            model_result=model_result)