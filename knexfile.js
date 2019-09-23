const path = require('path');

const BASE_PATH = path.join(__dirname, 'src', 'server', 'db');

module.exports = {
    test: {
        client: 'pg',
        connection: 'postgres://postgres:postgres@localhost:5432/tormundo_test',
        migrations: {
            directory: path.join(BASE_PATH, 'migrations')
        },
        seeds: {
            directory: path.join(BASE_PATH, 'test_seeds')
        }
    },
    development: {
        client: 'pg',
        connection: 'postgres://postgres:postgres@localhost:5432/tormundo',
        migrations: {
            directory: path.join(BASE_PATH, 'migrations')
        },
        seeds: {
            directory: path.join(BASE_PATH, 'test_seeds')
        }
    }
};
