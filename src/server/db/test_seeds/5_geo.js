
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('geo_location').del()
    .then(function () {
      // Inserts seed entries
      return knex('geo_location').insert([
        {organization_id: 999, country: 'France', city: 'Paris', lat: 48.8553136, lng: 2.418493200000057},
        {organization_id: 1000, country: 'France', city: 'Paris', lat: 48.85572579999999, lng: 2.358403899999985}
      ]);
    });
};
