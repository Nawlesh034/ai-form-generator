
import { boolean } from "drizzle-orm/pg-core";
import { pgTable,serial, varchar,text, integer, bigserial, numeric } from "drizzle-orm/pg-core";
// import { createDefineEnv } from "next/dist/build/swc";



export const JsonForms=pgTable('JsonForms',{
    id:serial('id').primaryKey().notNull(),
    jsonForm:text('jsonform').notNull(),
    theme:varchar('theme'),
    CreatedBy:varchar('createdBy').notNull(),
    CreatedAt:varchar('createdAt').notNull(),
    enabledSignIn:boolean('enabledSignIn').default(false),
   

})

export const userResponse=pgTable('userResponse',{
    id:serial('id').primaryKey(),
    jsonResponse:text('jsonResponse').notNull(),
    CreatedBy:varchar('createdBy').default('anonymus'),
    CreatedAt:varchar('createdAt').notNull(),

    refForm:integer('refForm').references(()=>JsonForms.id,{onDelete: 'cascade'},{onUpdate:'cascade'})
    
})