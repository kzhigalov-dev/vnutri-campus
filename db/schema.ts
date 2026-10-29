import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const bookings=sqliteTable('bookings',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),email:text('email').notNull(),roomId:text('room_id').notNull(),date:text('date').notNull(),start:integer('start').notNull(),hours:integer('hours').notNull(),seats:text('seats').notNull(),createdAt:text('created_at').notNull(),status:text('status').notNull().default('active'),emailStatus:text('email_status').notNull().default('pending'),tokenHash:text('token_hash').notNull()
});
export const bookingSlots=sqliteTable('booking_slots',{
 bookingId:text('booking_id').notNull().references(()=>bookings.id),roomId:text('room_id').notNull(),date:text('date').notNull(),hour:integer('hour').notNull(),seat:integer('seat').notNull()
},t=>[primaryKey({columns:[t.roomId,t.date,t.hour,t.seat]})]);
