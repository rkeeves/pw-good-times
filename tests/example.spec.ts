import { expect, test } from '@playwright/test';
import { attempt } from '@client';
import { list, find, add, update, remove, User } from '@jsonplaceholder/users';
import { createFixture } from 'zod-fixture';

test.describe('users', () => {
  test('list', async ({ request }) => {
    const users = await attempt(request, list()).expect(list.ok);
    expect(users).toHaveLength(10);
  });
  test('add', async ({ request }) => {
    let user = createFixture(User, { seed: 1 });
    user = await attempt(request, add(user)).expect(add.ok);
    expect(user.id).toBe(11);
  });
  test('find ok', async ({ request }) => {
    const user = await attempt(request, find(1)).expect(find.ok);
    expect(user.id).toBe(1);
  });
  test('find notFound', async ({ request }) => {
    await attempt(request, find(11)).expect(find.notFound);
  });
  test('update ok', async ({ request }) => {
    let user = createFixture(User, { seed: 1 });
    user = await attempt(request, update(1, user)).expect(update.ok);
    expect(user.id).toBe(1);
  });
  test('update notFound', async ({ request }) => {
    let user = createFixture(User, { seed: 1 });
    await attempt(request, update(11, user)).expect(update.notFound);
  });
  test('remove ok', async ({ request }) => {
    await attempt(request, remove(10)).expect(remove.ok);
  });
  test('remove notFound', async ({ request }) => {
    await attempt(request, remove(11)).expect(remove.notFound);
  });
});
