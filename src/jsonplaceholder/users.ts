import { Req, Res } from '@client';
import { z } from 'zod';

export const Address = z.object({
  street: z.string(),
  suite: z.string(),
  city: z.string(),
  zipcode: z.string(),
  geo: z.object({
    lat: z.string(),
    lng: z.string(),
  }),
});

export const Company = z.object({
  name: z.string(),
  catchPhrase: z.string(),
  bs: z.string(),
});

export const User = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  username: z.string(),
  email: z.string().email(),
  address: Address,
  phone: z.string(),
  website: z.string(),
  company: Company,
});

export function list() {
  return Req.get(`/users`);
}
list.ok = Res.json(200, z.array(User));

export function find(id: number) {
  return Req.get(`/users/${id}`);
}
find.ok = Res.json(200, User);
find.notFound = Res.blank(404);

export function add(user: z.infer<typeof User>) {
  return Req.post('/users', {
    data: user,
  });
}
add.ok = Res.json(201, User);

export function update(id: number, user: z.infer<typeof User>) {
  return Req.put(`/users/${id}`, {
    data: user,
  });
}
update.ok = Res.json(200, User);
update.notFound = Res.blank(404);

export function remove(id: number) {
  return Req.delete(`/users/${id}`);
}
remove.ok = Res.blank(200);
remove.notFound = Res.blank(200);
