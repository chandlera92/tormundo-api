
exports.up = function(knex, Promise) {
  return knex.schema
      .createTable('countries', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable();
          table.string('code').notNullable();
      })
      .createTable('languages', (table) => {
          table.increments('id').primary();
          table.string('name').notNullable();
          table.string('nativeName').notNullable();
          table.string('code').notNullable();
      })
      .createTable('currencies', (table) => {
          table.increments('id').primary();
          table.string('symbol').notNullable();
          table.string('name').notNullable();
          table.string('symbol_native').notNullable();
          table.integer('decimal_digits');
          table.decimal('rounding');
          table.string('code');
          table.string('name_plural');
      })


};

exports.down = function(knex, Promise) {
    return knex.schema
        .dropTable('countries')
        .dropTable('languages')
        .dropTable('currencies')
};
