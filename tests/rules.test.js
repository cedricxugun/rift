import { describe, test, expect } from 'bun:test';
import { growthForMass, canSwallow, evolutionFor, rewardFor, createRng } from '../src/rules.js';

describe('the swallowing and combat contract', () => {
  test('an early threat becomes directly edible after actual mouth growth', () => {
    const midgame = growthForMass(139);
    const grown = growthForMass(140);
    expect(midgame.level).toBe(2);
    expect(canSwallow(midgame.radius, 1.94)).toBe(false);
    expect(grown.level).toBe(3);
    expect(canSwallow(grown.radius, 1.94)).toBe(true);
  });

  test('the opening must clear the entire target, including the visible edge allowance', () => {
    expect(canSwallow(1.62, 1.6)).toBe(false);
    expect(canSwallow(1.62, 1.56)).toBe(true);
  });

  test('growth respects milestone boundaries and ends at the maximum size', () => {
    expect(growthForMass(0)).toMatchObject({ level: 1, next: 22 });
    expect(growthForMass(21.9).level).toBe(1);
    expect(growthForMass(22).level).toBe(2);
    expect(growthForMass(255).level).toBe(4);
    expect(growthForMass(10000)).toMatchObject({ level: 5, radius: 3.75, next: null });
  });

  test.each([
    [{ cannon: 1, wind: 1, ice: 0 }, 'vortex'],
    [{ cannon: 1, wind: 0, ice: 1 }, 'shatter'],
    [{ cannon: 0, wind: 1, ice: 1 }, 'blizzard'],
  ])('every offered pair has a complete evolution', (modules, evolution) => {
    expect(evolutionFor(modules)).toBe(evolution);
  });

  test('rewards are independent of the target health when it is swallowed', () => {
    const target = { mass: 24, rewardCore: 'ice', evolutionCore: true };
    expect(rewardFor({ ...target, hp: 100 })).toEqual(rewardFor({ ...target, hp: 0 }));
    expect(rewardFor(target)).toEqual({ mass: 24, core: 'ice', evolution: true });
  });

  test('an expedition seed replays the same random choices', () => {
    const first = createRng(17031), replay = createRng(17031), different = createRng(17032);
    const firstChoices = Array.from({ length: 8 }, first);
    expect(Array.from({ length: 8 }, replay)).toEqual(firstChoices);
    expect(Array.from({ length: 8 }, different)).not.toEqual(firstChoices);
    expect(firstChoices.every(value => value >= 0 && value < 1)).toBe(true);
  });
});
