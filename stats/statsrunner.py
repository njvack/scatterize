# coding: utf8
# Part of scatterize -- a statistical exploration tool
#
# Copyright (c) 2011 Board of Regents of the University of Wisconsin System
#
# scatterize is licensed under the GPLv3 -- see LICENSE for details.
#
# Written by Nathan Vack <njvack@wisc.edu> at the Waisman Laborotory
# for Brain Imaging and Behavior, University of Wisconsin - Madison.

import os
import csv
import numpy as np
import scikits.statsmodels.api as sm

import settings
from utils import json_float

import logging
logger = logging.getLogger("statsrunner")


class RegressionParams(object):
    """
    The parameters we're going to feed to our StatsRunner -- contains
    everything necessary to specify an analysis.
    """

    def __init__(self, model_type, dv_idx, iv_idx, nuis_idxs, highlight_idx,
        censor_idxs):

        self.model_type = model_type
        self.dv_idx = dv_idx
        self.iv_idx = iv_idx
        self.nuis_idxs = nuis_idxs
        self.highlight_idx = highlight_idx
        self.censor_idxs = censor_idxs

    @classmethod
    def build_from_flask_args(cls, args):
        x_idx = int(args.get("x", 0))
        y_idx = int(args.get("y", 0))
        nuis_idxs = []
        nlist = args.get("n", "").strip()
        if nlist != "":
            nuis_idxs = [int(i) for i in nlist.split(",")]

        censor_idxs = []
        clist = args.get("c", "").strip()
        if clist != "":
            censor_idxs = [int(i) for i in clist.split(",")]

        mtype = args.get("m", "OLS")
        highlight_idx = args.get("h", None)

        return cls(mtype, y_idx, x_idx, nuis_idxs, highlight_idx, censor_idxs)


class StatsRunner(object):
    """The thing you'll use to actually run your statistics."""

    def __init__(self, stats_data, regression_params):
        super(StatsRunner, self).__init__()
        self.stats_data = stats_data
        self.regression_params = regression_params

    def run(self):
        """
        Reads a CSV file and runs some stats on it.
        """
        model_types = {
            'OLS': {
                'model_fx': self._run_ols,
                'json_fx': self._jsonify_ols},
            'RLM': {
                'model_fx': self._run_rlm,
                'json_fx': self._jsonify_rlm}}

        data_array = self.stats_data.data_array
        column_names = self.stats_data.column_names
        params = self.regression_params

        row_count = data_array.shape[0]
        modeled_idxs = [params.dv_idx, params.iv_idx] + params.nuis_idxs
        modeled_data = data_array[:, modeled_idxs]
        possible_rows = np.all(np.isfinite(modeled_data), axis=1) # A mask!
        filtered_data = data_array[possible_rows]
        # The UI forces our censor_rows to be relative to possible_rows.
        logger.debug(filtered_data)
        censor_ar = np.zeros((row_count, len(params.censor_idxs)))
        for i, r in enumerate(params.censor_idxs):
            censor_ar[r][i] = 1.
        filtered_censor_ar = censor_ar[possible_rows]

        dv = filtered_data[:, params.dv_idx]
        const_term = np.ones_like(dv)
        iv = filtered_data[:, params.iv_idx]
        nuisance_v = filtered_data[:, params.nuis_idxs]
        weights = np.ones_like(dv).astype(np.int)
        X = np.column_stack((const_term, iv, nuisance_v, filtered_censor_ar))
        X_nocen = np.column_stack((const_term, iv, nuisance_v))
        logger.debug(X)

        self.result = model_types[params.model_type]['model_fx'](dv, X)
        result = self.result
        result_nocen = model_types[params.model_type]['model_fx'](dv, X_nocen)
        plot_resid = result.resid.copy()
        plot_resid[params.censor_idxs] = result_nocen.resid[params.censor_idxs]
        # This is ugly! Must refactor.
        if (params.model_type == "RLM"):
            weights = result.weights
        weights[params.censor_idxs] = 0

        plot_yvals = result.params[0]+(result.params[1]*iv)+plot_resid
        #point_groups = np.array(group_assignment)[possible_rows]
        point_groups = np.zeros_like(weights)
        logger.debug(iv.shape)
        logger.debug(plot_yvals.shape)
        logger.debug(weights.shape)
        logger.debug(point_groups.shape)
        self.points = np.column_stack((iv, plot_yvals, weights, point_groups))
        self.all_point_data = np.column_stack((self.points, dv, X))

        self.all_point_cols = ['x', 'y', 'weight', 'group',
            'dv_%s' % column_names[params.dv_idx],
            'const',
            'iv_%s' % column_names[params.iv_idx]]

        for i, n_idx in enumerate(params.nuis_idxs):
            self.all_point_cols.append(
                "nuis_%s_%s" % (i, column_names[n_idx]))
        for i in range(len(params.censor_idxs)):
            self.all_point_cols.append("censor_%s" % i)

        return model_types[params.model_type]['json_fx'](
            self.result, self.points)

    def _map_point_groups(self, data_iter, group_idx):
        gi_int = -1
        try:
            gi_int = int(group_idx)
        except:
            pass # This is OK.
        group_assignment = []
        group_map = {}
        group_num = 0
        for r in data_iter:
            if gi_int >= 0:
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
            'name'      : "Constant"}

        coef_result['x'] = {
            'b'         : json_float(mr.params[1]),
            't'         : json_float(mr.tvalues[1]),
            'p'         : json_float(mr.pvalues[1]),
            'se'        : json_float(mr.bse[1]),
            'col_idx'   : self.regression_params.iv_idx,
            'name'      : self.stats_data.column_names[
                self.regression_params.iv_idx]}

        for i, col_idx in enumerate(self.regression_params.nuis_idxs):
            res_i = i+2
            coef_result["n_%s" % col_idx] = {
                'b'  : json_float(mr.params[res_i]),
                't'  : json_float(mr.tvalues[res_i]),
                'p'  : json_float(mr.pvalues[res_i]),
                'se' : json_float(mr.bse[res_i]),
                'col_idx' : col_idx,
                'name' : self.stats_data.column_names[col_idx]}

        model_result = {
            "Rsq"    : json_float(mr.rsquared),
            "RsqAdj" : json_float(mr.rsquared_adj),
            "F"      : json_float(mr.fvalue),
            "Fpv"    : json_float(mr.f_pvalue)}

        return dict(points=points.tolist(), coef_result=coef_result,
            model_result=model_result,
            all_point_data=self.all_point_data.tolist(),
            all_point_cols=self.all_point_cols)

    def _run_rlm(self, endog, exog):
        rlm_model = sm.RLM(endog, exog, M=sm.robust.norms.HuberT())

        return rlm_model.fit()

    def _jsonify_rlm(self, model_result, points):
        mr = model_result
        coef_result = {}
        coef_result['const'] = {
            'b'         : json_float(mr.params[0]),
            't'         : json_float(mr.tvalues[0]),
            'p'         : json_float(mr.pvalues[0]),
            'se'        : json_float(mr.bse[0]),
            'col_idx'   : None,
            'name'      : "Constant"}

        coef_result['x'] = {
            'b'         : json_float(mr.params[1]),
            't'         : json_float(mr.tvalues[1]),
            'p'         : json_float(mr.pvalues[1]),
            'se'        : json_float(mr.bse[1]),
            'col_idx'   : self.regression_params.iv_idx,
            'name'      : self.stats_data.column_names[
                self.regression_params.iv_idx]}

        for i, col_idx in enumerate(self.regression_params.nuis_idxs):
            res_i = i+2
            coef_result["n_%s" % col_idx] = {
                'b'  : json_float(mr.params[res_i]),
                't'  : json_float(mr.tvalues[res_i]),
                'p'  : json_float(mr.pvalues[res_i]),
                'se' : json_float(mr.bse[res_i]),
                'col_idx' : col_idx,
                'name' : self.stats_data.column_names[col_idx]}

        model_result = {
            "Rsq"    : json_float(np.nan),
            "RsqAdj" : json_float(np.nan),
            "F"      : json_float(np.nan),
            "Fpv"    : json_float(np.nan)}

        return dict(points=points.tolist(), coef_result=coef_result,
            model_result=model_result,
            all_point_data=self.all_point_data.tolist(),
            all_point_cols=self.all_point_cols)
