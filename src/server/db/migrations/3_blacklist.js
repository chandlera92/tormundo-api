exports.up = (knex, Promise) => {
    return knex.schema
        .createTable('blacklist', (table) => {
            table.increments().primary();
            table.string('token').unique().notNullable();
        })
};

exports.down = (knex, Promise) => {
    return knex.schema
        .dropTable('blacklist');
};