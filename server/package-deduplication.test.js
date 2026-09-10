import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupePackages } from './package-deduplication.js';

test('dedupes packages with the same normalized identity', () => {
  const packages = [
    {
      id: 'old-inactive',
      game: ' PUBG ',
      name: ' 60 UC ',
      inGameAmount: 60,
      usdtValue: '1.5000',
      isActive: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'new-active',
      game: 'pubg',
      name: '60 uc',
      inGameAmount: 60,
      usdtValue: '1.5000',
      isActive: true,
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  const result = dedupePackages(packages);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'new-active');
  assert.equal(result[0].isActive, true);
});
