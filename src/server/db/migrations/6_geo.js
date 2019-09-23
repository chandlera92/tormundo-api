exports.up = function (knex, Promise) {
    return knex.schema
        .createTable('geo_location', (table) => {
            table.increments('id').primary();
            table.integer('organization_id').references('id').inTable('organization').notNull();
            table.integer('project_id').references('id').inTable('project').defaultsTo(null);
            table.string('lat').notNull();
            table.string('lng').notNull();
            table.string('country').notNull();
            table.string('city').notNull();
        })
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable('geo_location')
};
