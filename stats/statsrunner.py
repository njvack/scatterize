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
from scipy import stats as ss
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


def get_stats_runner(stats_data, regression_params):
    model_runners = {
        'OLS': OLSStatsRunner,
        'RLM': RLMStatsRunner,
        'SR': SpearmanStatsRunner}

    cls = model_runners[regression_params.model_type]

    return cls(stats_data, regression_params)


class GenericStatsRunner(object):

    def __init__(self, stats_data, regression_params):
        self.stats_data = stats_data
        self.regression_params = regression_params
        super(GenericStatsRunner, self).__init__()

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

    def _row_id_array(self):
        return np.arange(self.stats_data.data_array.shape[0])

    def _non_censored_mask(self):
        data = self.stats_data.data_array
        params = self.regression_params
        mask = np.ones((data.shape[0]), dtype=bool)
        mask[params.censor_idxs] = False
        return mask


class ParametricStatsRunner(GenericStatsRunner):

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

    def _x_y_labels(self):
        params = self.regression_params
        column_names = self.stats_data.column_names
        xl = column_names[params.iv_idx]
        yl = column_names[params.dv_idx]
        if len(params.nuis_idxs) > 0:
            yl = "Residualized %s" % yl
        return [xl, yl]

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

        result = self._make_model(dv_filtered, dm_to_run).fit()
        self.include_cols = include_cols
        self.result = result

    def to_dict(self):
        params = self.regression_params
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
        x_label, y_label = self._x_y_labels()

        return dict(
            points=points.tolist(),
            stats_diagnostics=self.diagnostics_list(),
            all_point_data=all_point_data.tolist(),
            all_point_cols=self._all_point_cols(self.include_cols),
            regression_line=regression_line,
            group_list=group_data['group_list'],
            x_label=x_label,
            y_label=y_label,
            model_type=params.model_type)


class  OLSStatsRunner(ParametricStatsRunner):

    def __init__(self, stats_data, regression_params):
        super(OLSStatsRunner, self).__init__(stats_data, regression_params)

    def _make_model(self, endog, exog):
        return sm.OLS(endog, exog)

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
        super(RLMStatsRunner, self).__init__(stats_data, regression_params)

    def weights(self):
        return self.result.weights

    def _make_model(self, endog, exog):
        return sm.RLM(endog, exog, M=sm.robust.norms.HuberT())

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


class SpearmanStatsRunner(GenericStatsRunner):
    """
    Computes Spearman's Rho:
    http://en.wikipedia.org/wiki/Spearman's_rank_correlation_coefficient
    on two variables. Note that this method does not allow covariates.
    """

    def _modeled_data(self):
        data = self.stats_data.data_array
        params = self.regression_params
        xvals = data[:, params.iv_idx]
        yvals = data[:, params.dv_idx]
        return np.column_stack((xvals, yvals))

    def _possible_rows(self):
        possible_rows = np.all(np.isfinite(self._modeled_data()), axis=1)
        return possible_rows

    def _all_point_cols(self):
        column_names = self.stats_data.column_names
        params = self.regression_params
        iv_name = column_names[params.iv_idx]
        dv_name = column_names[params.dv_idx]
        rx_name, ry_name = self._x_y_labels()
        cols = ['rowid', rx_name, ry_name, 'weight', 'group', iv_name, dv_name]
        return cols

    def _x_y_labels(self):
        column_names = self.stats_data.column_names
        params = self.regression_params
        iv_name = column_names[params.iv_idx]
        dv_name = column_names[params.dv_idx]
        rx_name = "%s rank" % iv_name
        ry_name = "%s rank" % dv_name
        return [rx_name, ry_name]

    def run(self):
        xy_points = self._modeled_data()
        good_rows = self._possible_rows()
        noncensored_rows = self._non_censored_mask()
        mask = np.logical_and(good_rows, noncensored_rows)
        valid_points = xy_points[good_rows]
        used_points = xy_points[mask]
        iv = used_points[:, 0]
        dv = used_points[:, 1]
        rho, p = ss.spearmanr(iv, dv)
        self.result = {
            'rho': rho,
            'p': p,
            'iv': valid_points[:, 0],
            'dv': valid_points[:, 1]}

    def diagnostics_list(self):
        diags = []
        diags.append({'title': 'Spearman Rank',
            'data': [
                ['rho', json_float(self.result.get('rho'))],
                ['p', json_float(self.result.get('p'))]]})
        return diags

    def to_dict(self):
        params = self.regression_params
        result = self.result
        good_rows = self._possible_rows()
        row_ids = self._row_id_array()[good_rows]
        group_data = self._group_data()

        groups = group_data['group_array'][good_rows]
        iv = result['iv']
        dv = result['dv']
        weights = self._non_censored_mask()[good_rows]
        logger.debug(repr(iv.shape))
        logger.debug(repr(weights.shape))
        xvals = ss.rankdata(iv)
        yvals = ss.rankdata(dv)
        logger.debug(xvals)
        logger.debug(yvals)
        points = np.column_stack((row_ids, xvals, yvals, weights, groups))
        all_point_data = np.column_stack((points, iv, dv))
        logger.debug(self._all_point_cols)
        col_names = self._all_point_cols()
        x_label, y_label = self._x_y_labels()

        return dict(
            points=points.tolist(),
            stats_diagnostics=self.diagnostics_list(),
            all_point_data=all_point_data.tolist(),
            all_point_cols=self._all_point_cols(),
            group_list=group_data['group_list'],
            x_label=x_label,
            y_label=y_label,
            model_type=params.model_type)


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
