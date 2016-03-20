'use strict';

const Bluebird = require('bluebird');

const Capture    = require('../../../../src/models/capture');
const Controller = require('../../../../src/plugins/features/captures/controller');
const Errors     = require('../../../../src/libraries/errors');
const Knex       = require('../../../../src/libraries/knex');

const firstPokemon  = Factory.build('pokemon', { national_id: 1 });
const secondPokemon = Factory.build('pokemon', { national_id: 2 });

const user = Factory.build('user');

const firstCapture = Factory.build('capture', { pokemon_id: firstPokemon.national_id, user_id: user.id });

describe('capture controller', () => {

  beforeEach(() => {
    return Bluebird.all([
      Knex('pokemon').insert([firstPokemon, secondPokemon]),
      Knex('users').insert(user)
    ])
    .then(() => {
      return Knex('captures').insert(firstCapture);
    });
  });

  describe('list', () => {

    it('returns a collection of captures, filling in those that do not exist', () => {
      return Controller.list({ user: user.id })
      .map((capture) => capture.serialize())
      .then((captures) => {
        expect(captures).to.have.length(2);
        expect(captures[0]).to.eql({
          pokemon_id: firstPokemon.national_id,
          user_id: user.id,
          captured: true
        });
        expect(captures[1]).to.eql({
          pokemon_id: secondPokemon.national_id,
          user_id: user.id,
          captured: false
        });
      });
    });

    it('rejects for a user id that does not exist', () => {
      return Controller.list({ user: -1 })
      .catch((err) => err) .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

  });

  describe('create', () => {

    it('creates a capture', () => {
      return Controller.create({ pokemon: secondPokemon.national_id }, { id: user.id })
      .then((capture) => {
        expect(capture.get('pokemon_id')).to.eql(secondPokemon.national_id);
        expect(capture.get('user_id')).to.eql(user.id);
        expect(capture.get('captured')).to.be.true;
      });
    });

    it('rejects with a bad pokemon id', () => {
      return Controller.create({ pokemon: -1 }, { id: user.id })
      .catch((err) => err) .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

    it('rejects if the capture already exists', () => {
      return Controller.create({ pokemon: firstPokemon.national_id }, { id: user.id })
      .catch((err) => err) .then((err) => {
        expect(err).to.be.an.instanceof(Errors.AlreadyExists);
      });
    });

  });

  describe('delete', () => {

    it('deletes a capture', () => {
      return Controller.delete({ pokemon: firstPokemon.national_id }, { id: user.id })
      .then((res) => {
        expect(res.deleted).to.be.true;

        return new Capture().where({ pokemon_id: firstPokemon.national_id, user_id: user.id }).fetch();
      })
      .then((capture) => {
        expect(capture).to.be.null;
      });
    });

    it('rejects with a bad pokemon id', () => {
      return Controller.delete({ pokemon: -1 }, { id: user.id })
      .catch((err) => err) .then((err) => {
        expect(err).to.be.an.instanceof(Errors.NotFound);
      });
    });

  });

});
