const knex = require('../connection');
const permissionHelpers = require('../../_helpers/permissions');

function findOrganizationFromName(t, params) {
    return knex
        .select('o.id as organization_id', 'o.name', 'o.accepted', 'o.owner', 'o.created_by', 'o.name', 'o.public', 'o.language_id', knex.raw('json_agg(distinct of) as files, json_agg(distinct op) as profiles, json_agg(distinct oc) as cards, json_agg(distinct gl) as location'))
        //    , knex.raw('json_agg(distinct of) as files'))
        .from('organization as o')
        .leftJoin('organization_file as of', 'o.id', 'of.organization_id')
        .leftJoin('organization_profile as op', 'o.id', 'op.organization_id')
        .leftJoin('organization_card as oc', 'o.id', 'oc.organization_id')
        .leftJoin('geo_location as gl', 'o.id', 'gl.organization_id')
        .where({"o.name": params.name})
        .groupBy('o.id')
        .first()
        .on('query-error', function(ex, obj) {
            console.log("KNEX query-error ex:", ex, "obj:", obj);
        })
        .then(res => {
            if (res) return res;
            else throw new Error(t.__('noResultsFound', 'Organization'));
        })
        .catch(err => err)
}

function checkAccountPermissions(db, params) {
    if (!db) db = knex;
    return db('organization_member as om')
        .select('oac.organization_member', 'oa.name')
        .innerJoin('organization_account_access as oac', 'om.id', 'oac.organization_member')
        .innerJoin('organization_account as oa', 'oa.id', 'oac.organization_account')
        .where(params)
        .first()
        .then(res => res)
        .catch(err => err)
}

function checkProjectAccess(db, params) {
    if (!db) db = knex;
    return db('organization_member as om')
        .select('*')
        .innerJoin('project_access as pa', (self) => {
            self
                .on('om.id', 'pa.organization_member')
                .on('om.organization_id', 'pa.organization_id')
        })
        .where(params)
        .first()
        .then(res => res)
        .catch(err => err)
}

function checkMultipleAccountPermissions(db, params) {
    if (!db) db = knex;
    return db
        .select(permissionHelpers.returnMemberPermissions)
        .from('organization_member')
        .whereIn('omp.id', params)
        .then(res => res)
        .catch(err => err);
}

function checkMemberPermissions(params) {
    return knex('organization_member as om')
        .select('*')
        .where(params)
        .innerJoin('organization_member_permissions as omp', 'om.organization_member_permissions_id', 'omp.id')
        .returning('*')
        .then(res => res)
        .catch(err => err)
}

function getProjectAndDocuments(params){
    return knex
        .select(knex.raw("json_build_object('project_id', p.id, 'project_location', p.project_location, 'start_date', p.start_date, 'end_date', p.end_date, 'currency', p.currency, 'goal', p.goal, 'pledged', p.pledged, 'public', p.public, 'suspended', p.suspended, 'public_at', p.public_at, 'suspended_at', p.suspended_at) as project, json_agg(distinct pf) as files"))
        .from('project as p')
        .leftJoin('project_file as pf', 'p.id', 'pf.project_id')
        .where(params)
        .groupBy('p.id')
        .on('query-error', function(ex, obj) {
            console.log("KNEX query-error ex:", ex, "obj:", obj);
        })
        .then(res => res[0])
        .catch(err => err)
}

module.exports = {
    checkMemberPermissions,
    findOrganizationFromName,
    checkAccountPermissions,
    checkMultipleAccountPermissions,
    checkProjectAccess,
    getProjectAndDocuments
}

/*
* select *
from organization_member as om
INNER JOIN organization_account_access as oaa on (oaa.organization_member = om.id)
INNER JOIN organization_account as oa on (oaa.organization_account = oa.id)
where om.user_id = 1 AND oa.name = 'contact@tormundo'



*
* */