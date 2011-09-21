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
        if highlight_idx is not None:
            highlight_idx = int(highlight_idx)

        return cls(mtype, y_idx, x_idx, nuis_idxs, highlight_idx, censor_idxs)

    @property
    def modeled_idxs(self):
        return [self.dv_idx, self.iv_idx] + self.nuis_idxs


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


class ParametricStatsRunner(object):

    def __init__(self, stats_data, regression_params):
        self.stats_data = stats_data
        self.regression_params = regression_params
        super(ParametricStatsRunner, self).__init__()

    def _build_design_matrix(self):
        data = self.stats_data.data_array
        logger.debug(data.shape)
        params = self.regression_params
        iv = data[:, params.iv_idx]
        const = np.ones_like(iv)
        nuisances = data[:, params.nuis_idxs]
        censors = self._build_censor_array()
        logger.debug("Const shape: %s" % const.shape)
        logger.debug("IV shape: %s" % iv.shape)
        logger.debug("nuis shape: %s" % str(nuisances.shape))
        logger.debug("censor shape: %s" % str(censors.shape))
        return np.column_stack((const, iv, nuisances, censors))

    def _design_matrix_allowable_rows(self):
        data = self.stats_data.data_array
        params = self.regression_params
        modeled_data = data[:, params.modeled_idxs]
        possible_rows = np.all(np.isfinite(modeled_data), axis=1)
        return possible_rows

    def _build_censor_array(self):
        data = self.stats_data.data_array
        params = self.regression_params
        censor_ar = np.zeros((data.shape[0], len(params.censor_idxs)))
        for i, r in enumerate(params.censor_idxs):
            censor_ar[r][i] = 1.
        return censor_ar

    def _row_id_array(self):
        return np.arange(self.stats_data.data_array.shape[0])

    def _non_censored_mask(self):
        data = self.stats_data.data_array
        params = self.regression_params
        mask = np.ones((data.shape[0]), dtype=bool)
        mask[params.censor_idxs] = False
        return mask

    def _nonzero_column_mask(self, design_matrix):
        dm_nonzeros = design_matrix <> 0.0
        return np.any(dm_nonzeros, axis=0)

    def _all_point_cols(self, nonzero_column_mask):
        params = self.regression_params
        column_names = self.stats_data.column_names

        plot_cols = ['rowid', 'x', 'y', 'weight', 'group']

        dm_cols = ['const', 'iv_%s' % column_names[params.iv_idx]]
        for i, n_idx in enumerate(params.nuis_idxs):
            dm_cols.append(
                "nuis_%s_%s" % (i, column_names[n_idx]))
        for i in range(len(params.censor_idxs)):
            dm_cols.append("censor_%s" % i)

        keep_cols = np.where(nonzero_column_mask)[0].tolist()
        logger.debug(keep_cols)
        logger.debug(dm_cols)
        dm_filtered = [dm_cols[i] for i in keep_cols]
        return plot_cols + dm_filtered

    def _group_data(self):
        ar = np.zeros(len(self.stats_data.data_list))
        output = {
            'group_list': [],
            'group_array': ar}

        idx = self.regression_params.highlight_idx
        if (idx):
            highlight_data = [row[idx] for row in self.stats_data.data_list]
            grouper = PointGrouper(highlight_data)
            output['group_list'] = grouper.group_list()
            output['group_array'] = grouper.group_array()

        return output

    def run(self):
        data = self.stats_data.data_array
        params = self.regression_params
        dv = data[:, params.dv_idx]
        iv = data[:, params.iv_idx]
        dm = self._build_design_matrix()
        include_rows = self._design_matrix_allowable_rows()
        logger.debug(include_rows)
        dm_filtered = dm[include_rows]
        dv_filtered = dv[include_rows]
        iv_filtered = iv[include_rows]
        include_cols = self._nonzero_column_mask(dm_filtered)
        dm_to_run = dm_filtered[:, include_cols]
        logger.debug("DM shape: %s, row filter: %s, col filter: %s" %(
            dm.shape, dm_filtered.shape, dm_to_run.shape))

        result = self.model_class(dv_filtered, dm_to_run).fit()
        self.include_cols = include_cols
        self.result = result

    def to_dict(self):
        mr = self.result
        column_names = self.stats_data.column_names

        xvals = mr.model.exog[:, 1]
        yvals = mr.params[0] + xvals*mr.params[1] + mr.resid

        good_rows = self._design_matrix_allowable_rows()
        rowids = self._row_id_array()[good_rows]
        group_data = self._group_data()

        groups = group_data['group_array'][good_rows]
        points = np.column_stack(
            (rowids, xvals, yvals, self.weights(), groups))

        all_point_data = np.column_stack((
            points, mr.model.endog, mr.model.exog))

        regression_line = {'const': mr.params[0], 'slope': mr.params[1]}

        return dict(
            points=points.tolist(),
            stats_diagnostics=self.diagnostics_list(),
            all_point_data=all_point_data.tolist(),
            all_point_cols=self._all_point_cols(self.include_cols),
            regression_line=regression_line,
            group_list=group_data['group_list'])


class  OLSStatsRunner(ParametricStatsRunner):

    def __init__(self, stats_data, regression_params):
        super(OLSStatsRunner, self).__init__(stats_data, regression_params)
        self.model_class = sm.OLS

    def weights(self):
        all_weights = self._non_censored_mask()
        weights = all_weights[self._design_matrix_allowable_rows()]
        return weights

    def diagnostics_list(self):
        mr = self.result
        column_names = self.stats_data.column_names
        diags = []
        diags.append({'title': 'Model fit',
            'data': [
                ['Rsq', json_float(mr.rsquared)],
                ['RsqAdj', json_float(mr.rsquared_adj)],
                ['F', json_float(mr.fvalue)],
                ['p', json_float(mr.f_pvalue)]]})

        diags.append({'title': 'Constant',
            'data': [
                ['b', json_float(mr.params[0])],
                ['t', json_float(mr.tvalues[0])],
                ['p', json_float(mr.pvalues[0])],
                ['se', json_float(mr.bse[0]), {'hide': True}]]})

        diags.append({'title': column_names[self.regression_params.iv_idx],
            'data': [
                ['b', json_float(mr.params[1])],
                ['t', json_float(mr.tvalues[1])],
                ['p', json_float(mr.pvalues[1])],
                ['se', json_float(mr.bse[1]), {'hide': True}]]})

        for i, col_idx in enumerate(self.regression_params.nuis_idxs):
            res_i = i+2
            diags.append({'title': column_names[col_idx],
                'data': [
                    ['b', json_float(mr.params[res_i])],
                    ['t', json_float(mr.tvalues[res_i])],
                    ['p', json_float(mr.pvalues[res_i])],
                    ['se', json_float(mr.bse[res_i])]]})
        return diags


class RLMStatsRunner(ParametricStatsRunner):

    def __init__(self, stats_data, regression_params):
        super(OLSStatsRunner, self).__init__(stats_data, regression_params)
        self.model_class = sm.OLS

    def weights(self):
        return self.result.weights

    def diagnostics_list(self):
        mr = self.result
        column_names = self.stats_data.column_names
        diags = []

        diags.append({'title': 'Constant',
            'data': [
                ['b', json_float(mr.params[0])],
                ['t', json_float(mr.tvalues[0])],
                ['p', json_float(mr.pvalues[0])],
                ['se', json_float(mr.bse[0]), {'hide': True}]]})

        diags.append({'title': column_names[self.regression_params.iv_idx],
            'data': [
                ['b', json_float(mr.params[1])],
                ['t', json_float(mr.tvalues[1])],
                ['p', json_float(mr.pvalues[1])],
                ['se', json_float(mr.bse[1]), {'hide': True}]]})

        for i, col_idx in enumerate(self.regression_params.nuis_idxs):
            res_i = i+2
            diags.append({'title': column_names[col_idx],
                'data': [
                    ['b', json_float(mr.params[res_i])],
                    ['t', json_float(mr.tvalues[res_i])],
                    ['p', json_float(mr.pvalues[res_i])],
                    ['se', json_float(mr.bse[res_i])]]})
        return diags


class PointGrouper(object):

    def __init__(self, groupable_list):
        self.groupable_list = groupable_list
        self.stripped_keys = self._strip_keys(groupable_list)

    def _strip_keys(self, l):
        return [str(val).strip() for val in l]

    def group_list(self):

        def sort_fx(key):
            """
            Return a tuple for sorting == will be
            (blank, key.strip())
            this will ensure blank entries get sorted last.
            And
            """
            return ((len(key) == 0), key)

        return sorted(set(self.stripped_keys), key=sort_fx)

    def group_dict(self):
        return dict([[key, idx] for idx, key in enumerate(self.group_list())])

    def group_array(self):
        d = self.group_dict()
        key_idxes = [d[k] for k in self.stripped_keys]
        return np.array(key_idxes)
