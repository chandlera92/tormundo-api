
exports.up = function(knex, Promise) {
  return knex.schema
      .createTable('message_group', (table) => {
          table.increments('id').primary();
          table.string('subject');
      })
      .createTable('message', (table) => {
          table.increments('id').primary();
          table.integer('group_id').references('id').inTable('message_group');
          table.text('text');
          table.boolean('attachments').notNullable().defaultsTo(false);
          table.timestamp('created_at').notNullable().defaultTo(knex.raw('now()'));
          table.string('sender').notNullable();
          table.string('a').notNullable();
          table.string('cc');
      })
      .createTable('message_attachments', (table) => {
          table.increments('id').primary();
          table.integer('message_id').references('id').inTable('message');
          table.string('loc');
          table.string('name');
          table.string('type');
      })
      .raw('CREATE TABLE message_custom_categories (' +
          'id serial PRIMARY KEY, ' +
          'user_account integer REFERENCES users(id), ' +
          'organization_account integer DEFAULT null REFERENCES organization_account(id) , ' +
          'path ltree, ' +
          'name varchar(255)' +
          ');'
      )
      .createTable('message_participants', (table) => {
          table.increments('id').primary();
          table.integer('message_id').references('id').inTable('message').notNull();
          table.integer('user_account').references('id').inTable('users').defaultsTo(null);
          table.integer('organization_account').references('id').inTable('organization_account').defaultsTo(null);
          table.integer('custom_category').defaultsTo(null).references('id').inTable('message_custom_categories');
          table.enum('category', ['inbox', 'sent', 'drafts', 'trash', null]).defaultsTo('inbox');
          table.boolean('read').notNullable().defaultsTo(false);
          table.boolean('deleted').notNullable().defaultsTo(false);
          table.boolean('replied').notNullable().defaultsTo(false);
          table.timestamp('read_at').defaultsTo(null);
          table.timestamp('replied_at').defaultsTo(null);
          table.timestamp('deleted_at').defaultsTo(null);
          table.boolean('important').defaultsTo(false);
          table.boolean('starred').defaultsTo(false);
      })
};

exports.down = function(knex, Promise) {
  return knex.schema
      .dropTable('message_attachments')
      .dropTable('message_participants')
      .dropTable('message_custom_categories')
      .dropTable('message')
      .dropTable('message_group')

};
