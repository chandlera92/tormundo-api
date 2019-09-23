const knex = require('../connection');

function patchQuery(db, info, params, table, returning) {
    if (!db) db = knex;
    return db
        .update(info)
        .into(table)
        .where(params)
        .returning(returning)
        .then(res => res)
        .catch(err => err)
}

function insertQuery(db, info, table, returning) {
    if (!db) db = knex;
    return db
        .insert(info)
        .into(table)
        .returning(returning)
        .then(res => res)
        .catch(err => err);
}

function insertSingleQuery(db, info, table, returning) {
    if (!db) db = knex;
    return db
        .insert(info)
        .into(table)
        .returning(returning)
        .then(res => res[0])
        .catch(err => err);
}


function deleteQuery(db, params, table, returning) {
    if (!db) db = knex;
    return db
        .delete()
        .from(table)
        .where(params)
        .returning(returning)
        .then(res => res)
        .catch(err => err)
}

function deleteMultipleRecords(db, table, whereInCol, whereInVal, returning){
    if(!db) db = knex;
    return db
        .delete()
        .from(table)
        .whereIn(whereInCol, whereInVal)
        .returning(returning)
        .then(res => res)
        .catch(err => err)
}


function singleSelectQuery(db, select, table, params) {
    if (!db) db = knex;
    return db
        .select(select)
        .from(table)
        .where(params)
        .first()
        .then(res => res)
        .catch(err => err)
}

function updateSingleQuery(db, info, table, params, returning) {
    if (!db) db = knex;
    return db
        .update(info)
        .from(table)
        .where(params)
        .returning(returning)
        .then(res => res[0])
        .catch(err => err);
}

function multiSelectQuery(db, select, table, params) {
    if (!db) db = knex;
    return db
        .select(select)
        .from(table)
        .where(params)
        .then(res => res)
        .catch(err => err)
}

function selectAllQuery(db, select, table) {
    if (!db) db = knex;
    return db
        .select(knex.raw(select))
        .from(table)
        .then(res => res)
        .catch(err => err)
}

function selectWhereInQuery(db, select, table, col, arr) {
    if (!db) db = knex;
    return db
        .select(select)
        .from(table)
        .whereIn(col, arr)
        .then(res => res)
        .catch(err => err)
}
function selectWhereInWhereQuery(db, select, table, params, col, arr) {
    if (!db) db = knex;
    return db
        .select(select)
        .from(table)
        .where(params)
        .whereIn(col, arr)
        .then(res => res)
        .catch(err => err)
}

function selectWhereOr(db, select, table, where1, where2){
    if (!db) db = knex;
    return db
        .select(select)
        .from(table)
        .where(where1)
        .orWhere(where2)
        .then(res => res)
        .catch(err => err)
}

function updateMultipleRecords(db, info, table, whereCol, params, returning){
    if(!db) db = knex;
    return db
        .update(info)
        .from(table)
        .whereIn(whereCol, params)
        .returning(returning)
        .then(res => res)
        .catch(err => err)
}



function checkIfLanguageValid(langId) {
    return knex('languages')
        .select('*')
        .where({id: langId})
        .first()
        .then(res => res)
        .catch(err => err);
}



module.exports = {
    insertQuery,
    insertSingleQuery,
    deleteQuery,
    patchQuery,
    singleSelectQuery,
    multiSelectQuery,
    selectWhereInQuery,
    selectWhereInWhereQuery,
    selectWhereOr,
    checkIfLanguageValid,
    updateSingleQuery,
    updateMultipleRecords,
    deleteMultipleRecords,
    selectAllQuery
}

/*

 function updateMultipleRecords1(db, table, set, values, as, where, returning){
    return db.raw(
        'UPDATE ' + table + ' ' +
        'SET ' + set + ' ' +
        'FROM(values' + values + ') ' +
        'AS clone(' + as + ') ' +
        'WHERE ' + where + ' ' +
        'RETURNING ' + returning
    )
        .then(res => res)
        .catch(err => err);
}
*
* */