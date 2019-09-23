// TODO: User_id references should be unique?

exports.up = (knex, Promise) => {
    return knex.schema
        .createTable('users', (table) => {
            table.increments('id').primary();
            table.string('user_name').unique().notNullable();
            table.string('email').unique().notNullable();
            table.string('password').notNullable();
            table.boolean('verified').notNullable().defaultTo(false);
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
            table.integer('country_id').references('id').inTable('countries').defaultsTo(230).onDelete('cascade');
            table.integer('language_id').references('id').inTable('languages').notNull().defaultsTo(1).onDelete('cascade');
            table.timestamp('password_modified').defaultTo(null);
        })
        .createTable('profile_image', (table) => {
            table.increments('id').primary();
            table.string('type').notNullable();
            table.string('key').notNullable();
            table.string('loc').notNullable();
        })
        .createTable('profile', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('users').notNull().onDelete('cascade');
            table.string('first_name').notNullable().defaultsTo('not provided');
            table.string('last_name').notNullable().defaultsTo('not provided');
            table.string('description').notNullable().defaultsTo('not provided');
            table.integer('profile_image_id').defaultsTo(null).references('id').inTable('profile_image');
            table.string('gravatar').notNull();
            table.boolean('gravatar_active').notNull().defaultsTo(true);
            table.decimal('amount_pledged').notNullable().defaultsTo(0);
            table.integer('projects_supported').notNullable().defaultsTo(0);
            table.timestamp('modified').defaultTo(null);
            table.boolean('public').notNullable().defaultsTo(true);
        })
        .createTable('verification', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('users').notNull().onDelete('cascade');
            table.string('code').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
        })
        .createTable('password_reset', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('users').notNull().onDelete('cascade');
            table.string('code').notNullable().unique();
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
        })
        .createTable('password_modified', (table) => {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('users').notNull().onDelete('cascade');
            table.string('password').notNullable();
            table.timestamp('timestamp').notNullable().defaultTo(knex.raw('now()'));
        })
};

exports.down = (knex, Promise) => {
    return knex.schema
        .dropTable('verification')
        .dropTable('password_reset')
        .dropTable('password_modified')
        .dropTable('profile')
        .dropTable('profile_image')
        .dropTable('users');
};