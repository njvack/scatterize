import csv
import numpy as np
import scikits.statsmodels.api as sm
from utils import json_float

class StatsRunner(object):
    """The thing you'll use to actually run your statistics."""
    def __init__(self, filename, dv_idx, iv_idx, nuis_idxs, 
            highlight_idx, censor_rows, model="OLS", model_options={}, logger=None):
        super(StatsRunner, self).__init__()
        self.filename = filename
        self.dv_idx = dv_idx
        self.iv_idx = iv_idx
        self.nuis_idxs = nuis_idxs
        self.highlight_idx = highlight_idx
        self.censor_rows = censor_rows
        self.model = model
        self.model_options = model_options
        self.logger = logger
    
    def run(self):
        model_types = {
            'OLS' : {
                'model_fx' : self._run_ols,
                'json_fx'  : self._jsonify_ols
            },
            'RLM' : {
                'model_fx' : self._run_rlm,
                'json_fx'  : self._jsonify_rlm
            }
        }
        
        with open(self.filename, 'rt') as csvfile:
            reader = csv.reader(csvfile, dialect="excel")
            self.column_names = reader.next()
            csvfile.seek(0)
            self.data_ar = np.genfromtxt(csvfile, delimiter=",", skip_header=1)
            group_map = {}
            point_groups = []
            csvfile.seek(0)
            reader.next()
            group_assignment, group_map = self._map_point_groups(
                reader, self.highlight_idx)
            if self.logger:
                self.logger.debug(self.highlight_idx)
                self.logger.debug(group_assignment)
                self.logger.debug(group_map)
        
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
        censor_ar = np.zeros((len(weights), len(self.censor_rows)))
        for i, r in enumerate(self.censor_rows):
            censor_ar[r][i] = 1.
        X = np.column_stack((const_term, iv, nuisance_v, censor_ar))
        
        self.result = model_types[self.model]['model_fx'](dv, X)
        result = self.result
        # This is ugly! Must refactor.
        if (self.model == "RLM"):
            weights = result.weights
        weights[self.censor_rows] = 0

        plot_yvals = result.params[0]+(result.params[1]*iv)+result.resid
        point_groups = np.array(group_assignment)
        self.points = np.column_stack((iv, plot_yvals, weights, point_groups))
        
        return model_types[self.model]['json_fx'](self.result, self.points)
        
    def _map_point_groups(self, data_iter, group_idx):
        self.logger.debug("Hello")
        gi_int = -1
        try:
            gi_int = int(group_idx)
        except:
            pass # This is OK.
        group_assignment = []
        group_map = {}
        group_num = 0
        for r in data_iter:
            self.logger.debug(gi_int)
            if gi_int >= 0:
                self.logger.debug(r[gi_int])
                glabel = r[gi_int]
                if not glabel in group_map:
                    group_map[glabel] = group_num
                    group_num += 1
                group_assignment.append(group_map[glabel])
            else:
                group_assignment.append(0)
        return (group_assignment, group_map)
        
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
        

    def _run_rlm(self, endog, exog):
        rlm_model = sm.RLM(endog, exog, M=sm.robust.norms.HuberT())
        
        return rlm_model.fit()
        
    def _jsonify_rlm(self, model_result, points):
        mr = model_result
        coef_result = {}
        coef_result['const'] = {
            'b'         : json_float(mr.params[0]),
            't'         : json_float(mr.tvalues[0]),
            'p'         : json_float(np.nan),
            'se'        : json_float(mr.bse[0]),
            'col_idx'   : None,
            'name'      : "Constant"
        }
        
        coef_result['x'] = {
            'b'         : json_float(mr.params[1]),
            't'         : json_float(mr.tvalues[1]),
            'p'         : json_float(np.nan),
            'se'        : json_float(mr.bse[1]),
            'col_idx'   : self.iv_idx,
            'name'      : self.column_names[self.iv_idx]
        }
        
        for i, col_idx in enumerate(self.nuis_idxs):
            res_i = i+2
            coef_result["n_%s" % col_idx] = {
                'b'  : json_float(mr.params[res_i]),
                't'  : json_float(mr.tvalues[res_i]),
                'p'  : json_float(np.nan),
                'se' : json_float(mr.bse[res_i]),
                'col_idx' : col_idx,
                'name' : self.column_names[col_idx]
            }
        
        model_result = {
            "Rsq"    : json_float(np.nan),
            "RsqAdj" : json_float(np.nan),
            "F"      : json_float(np.nan),
            "Fpv"    : json_float(np.nan)
        }
        
        return dict(points=points.tolist(), coef_result=coef_result, 
            model_result=model_result)
        

