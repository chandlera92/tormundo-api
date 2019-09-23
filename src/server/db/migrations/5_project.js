exports.up = function (knex, Promise) {
    return knex.schema
        .createTable('project', (table) => {
            table.increments('id').primary();
            table.integer('organization_id').references('id').inTable('organization').notNull();
            table.string('project_location').notNull();
            table.timestamp('start_date').notNull();
            table.timestamp('end_date').notNull();
            table.integer('currency').references('id').inTable('currencies').notNull().defaultsTo(3);
            table.integer('goal').notNull().defaultsTo(0);
            table.integer('pledged').notNull().defaultsTo(0);
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.integer('modified_by').references('id').inTable('users');
            table.timestamp('modified_at');
            table.boolean('public').defaultsTo(false).notNullable();
            table.boolean('suspended').defaultsTo(false).notNullable();
            table.timestamp('public_at');
            table.timestamp('suspended_at');
        })
        .createTable('project_history', (table) => {
            table.increments('id').primary();
            table.integer('project_id').notNull();
            table.string('project_location').notNull();
            table.timestamp('start_date').notNull();
            table.timestamp('end_date').notNull();
            table.integer('currency').notNull();
            table.integer('goal').notNull();
            table.integer('pledged').notNull();
            table.boolean('public').notNullable();
            table.boolean('suspended').notNullable();
            table.timestamp('public_at');
            table.timestamp('suspended_at');
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
        })
        .createTable('project_removed', (table) => {
            table.increments('id').primary();
            table.integer('project_id').notNull();
            table.string('project_location').notNull();
            table.timestamp('start_date').notNull();
            table.timestamp('end_date').notNull();
            table.integer('currency').notNull();
            table.integer('goal').notNull();
            table.integer('pledged').notNull();
            table.integer('language_id').notNullable();
            table.boolean('public').notNullable();
            table.boolean('suspended').notNullable();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull();
            table.integer('removed_by').notNull();
            table.timestamp('removed_at').notNull().defaultsTo('now()');
        })
        .createTable('project_access', (table) => {
            table.increments('id').primary();
            table.integer('organization_id').references('id').inTable('organization').notNull();
            table.integer('organization_member').references('id').inTable('organization_member').notNull();
            table.integer('project_id').references('id').inTable('project').notNull();
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').defaultTo(knex.raw('now()'));
        })
        .createTable('project_access_history', (table) => {
            table.increments('id').primary();
            table.integer('organization_id').notNull();
            table.integer('organization_member').notNull();
            table.integer('project_id').notNull();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull();
            table.integer('removed_by').notNull();
            table.timestamp('removed_at').defaultTo(knex.raw('now()'));
        })
        .createTable('project_file', (table) => {
            table.increments('id').primary();
            table.integer('project_id').references('id').inTable('project').notNullable();
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').defaultTo(knex.raw('now()')).notNull();
            table.integer('modified_by').references('id').inTable('users').defaultsTo(null);
            table.timestamp('modified_at').defaultTo(null);
            table.string('name');
            table.string('description');
            table.string('type').notNullable();
            table.string('key').notNullable();
            table.string('loc').notNullable();
        })
        .createTable('project_file_history', (table) => {
            table.increments('id').primary();
            table.integer('project_file_id').notNullable();
            table.string('name');
            table.string('description');
            table.string('type').notNullable();
            table.string('key').notNullable();
            table.string('loc').notNullable();
            table.integer('created_by').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
        })
        .createTable('project_profile', (table) => {
            table.increments('id').primary();
            table.integer('project_id').references('id').inTable('project').notNullable();
            table.string('name');
            table.string('description');
            table.integer('language_id').references('id').inTable('languages').notNullable().defaultsTo(1);
            table.boolean('public').notNull().defaultsTo(false);
            table.integer('cover_image').references('id').inTable('project_file').defaultsTo(null);
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').defaultsTo('now()');
            table.integer('modified_by').references('id').inTable('users').defaultsTo(null);
            table.timestamp('modified_at').defaultsTo(null);
        })
        .createTable('project_profile_history', (table) => {
            table.increments('id').primary();
            table.integer('profile_id').notNullable();
            table.integer('project_id').notNullable();
            table.string('name');
            table.string('description');
            table.integer('cover_image');
            table.integer('created_by').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
            table.integer('language_id').notNullable();
            table.boolean('public').notNullable();
        })
        .createTable('project_profile_removed', (table) => {
            table.increments('id').primary();
            table.integer('profile_id').notNullable();
            table.integer('project_id').notNullable();
            table.string('name');
            table.string('description');
            table.integer('cover_image');
            table.integer('language_id').notNullable();
            table.boolean('public').notNullable();
            table.integer('created_by').notNullable();
            table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
            table.integer('removed_by').notNullable();
            table.timestamp('removed_at').notNullable().defaultTo(knex.raw('now()'));
        })
        .createTable('project_update', (table) => {
            table.increments('id').primary();
            table.integer('project_id').references('id').inTable('project').notNullable();
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.integer('modified_by').references('id').inTable('users').defaultsTo(null);
            table.timestamp('modified_at');
            table.boolean('public').notNull().defaultsTo(false);
        })
        .createTable('project_update_history', (table) => {
            table.increments('id').primary();
            table.integer('project_update_id').notNull();
            table.boolean('public').notNull();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
        })
        .createTable('project_update_removed', (table) => {
            table.increments('id').primary();
            table.integer('project_update_id').notNull();
            table.boolean('public').notNull();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.integer('removed_by').notNull();
            table.timestamp('removed_at').notNull().defaultsTo('now()');
        })
        .createTable('project_update_profile', (table) => {
            table.increments('id').primary();
            table.integer('project_update_id').references('id').inTable('project_update').notNullable();
            table.integer('language_id').references('id').inTable('languages').notNullable().defaultsTo(1);
            table.integer('created_by').references('id').inTable('users').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.integer('modified_by').references('id').inTable('users').defaultsTo(null);
            table.timestamp('modified_at');
            table.string('title').notNull();
            table.string('body').notNull();
            table.boolean('public').notNullable();
        })
        .createTable('project_update_profile_history', (table) => {
            table.increments('id').primary();
            table.integer('project_profile_id').notNullable();
            table.integer('language_id').notNullable();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.string('title').notNull();
            table.string('body').notNull();
            table.boolean('public').notNullable();
        })
        .createTable('project_update_profile_removed', (table) => {
            table.increments('id').primary();
            table.integer('project_profile_id').notNullable();
            table.integer('language_id').notNullable();
            table.integer('created_by').notNull();
            table.timestamp('created_at').notNull().defaultsTo('now()');
            table.integer('removed_by').notNull();
            table.timestamp('removed_at').notNull().defaultsTo('now()');
            table.string('title').notNull();
            table.string('body').notNull();
            table.boolean('public').notNullable();
        })
};

exports.down = function (knex, Promise) {
    return knex.schema
        .dropTable('project_update_profile_removed')
        .dropTable('project_update_profile_history')
        .dropTable('project_update_profile')
        .dropTable('project_update_removed')
        .dropTable('project_update_history')
        .dropTable('project_update')
        .dropTable('project_profile_removed')
        .dropTable('project_profile_history')
        .dropTable('project_profile')
        .dropTable('project_file_history')
        .dropTable('project_file')
        .dropTable('project_access_history')
        .dropTable('project_access')
        .dropTable('project_removed')
        .dropTable('project_history')
        .dropTable('project')
};
