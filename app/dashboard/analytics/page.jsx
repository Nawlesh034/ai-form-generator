// app/dashboard/analytics/page.jsx
"use client"
import { db } from '@/config'
import { JsonForms, userResponse } from '@/config/schema'
import { extractJson } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import { eq, inArray } from 'drizzle-orm'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

function Analytics() {
  const { user } = useUser()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const email = user?.primaryEmailAddress?.emailAddress
      const formRows = await db.select().from(JsonForms).where(eq(JsonForms.CreatedBy, email))

      const formIds = formRows.map((f) => f.id)
      const responseRows = formIds.length
        ? await db.select().from(userResponse).where(inArray(userResponse.refForm, formIds))
        : []

      const countByFormId = new Map()
      responseRows.forEach((r) => {
        countByFormId.set(r.refForm, (countByFormId.get(r.refForm) || 0) + 1)
      })

      const withCounts = formRows
        .map((f) => ({
          id: f.id,
          title: extractJson(f.jsonForm)?.formTitle || 'Untitled Form',
          responseCount: countByFormId.get(f.id) || 0,
        }))
        .sort((a, b) => b.responseCount - a.responseCount)

      setForms(withCounts)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    user && getAnalytics()
  }, [user])

  const totalForms = forms.length
  const totalResponses = forms.reduce((sum, f) => sum + f.responseCount, 0)
  const avgResponses = totalForms > 0 ? (totalResponses / totalForms).toFixed(1) : 0

  if (loading) {
    return <div className='p-10'>Loading analytics...</div>
  }

  if (error) {
    return <div className='p-10 text-red-500'>{error}</div>
  }

  if (totalForms === 0) {
    return (
      <div className='p-10'>
        <h2 className='font-bold text-3xl mb-2'>Analytics</h2>
        <p className='text-gray-500'>Create your first form to see analytics.</p>
      </div>
    )
  }

  return (
    <div className='p-10'>
      <h2 className='font-bold text-3xl mb-6'>Analytics</h2>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Total Forms</h3>
          <p className='text-3xl font-bold'>{totalForms}</p>
        </div>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Total Responses</h3>
          <p className='text-3xl font-bold'>{totalResponses}</p>
        </div>
        <div className='border shadow-sm rounded-lg p-4'>
          <h3 className='text-sm text-gray-500'>Avg Responses / Form</h3>
          <p className='text-3xl font-bold'>{avgResponses}</p>
        </div>
      </div>

      <h3 className='font-semibold text-lg mb-3'>Responses by Form</h3>
      <div className='space-y-2'>
        {forms.map((form) => (
          <Link
            key={form.id}
            href='/dashboard/responses'
            className='flex justify-between items-center border shadow-sm rounded-lg p-4 hover:bg-gray-50'
          >
            <span>{form.title}</span>
            <span className='font-semibold'>{form.responseCount} Response{form.responseCount !== 1 ? 's' : ''}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Analytics
