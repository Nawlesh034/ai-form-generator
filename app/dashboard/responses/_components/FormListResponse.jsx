import { Button } from '@/components/ui/button'
import { db } from '@/config'
import { userResponse } from '@/config/schema'
import { eq } from 'drizzle-orm'
import { Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import * as XLSX from 'xlsx'

function FormListResponse({formRecord,jsonform}) {

    const[loading,setLoading]=useState(false)

    const ExportData=async()=>{
        let jsonData=[]
        setLoading(true);
        const result=await db.select().from(userResponse)
        .where(eq(userResponse.refForm,formRecord.id))
        console.log(result)
        if(result){
            result.forEach((item)=>{
                const jsonItem=JSON.parse(item.jsonResponse)
                jsonData.push(jsonItem)
            })
            setLoading(false)
        }
        console.log(jsonData)
        exportToExcel(jsonData)
    }

    /*convert Json to Excel and the download it*/
     
    const exportToExcel = (jsonData, jsonform) => {
        const worksheet = XLSX.utils.json_to_sheet(jsonData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, "Document.xlsx");
    };
  return (
    <div className='border shadow-sm rounded-lg p-4'>
        
        <h2 className='text-lg text-black'>
          {jsonform?.title}
        </h2>
        <h2 className='text-sm text-gray-500'>{jsonform?.subheading}</h2>
        <hr className='my-4'></hr>
        <div className='flex justify-between items-center'>
       
         <h2 className='text-sm'>45 Responses</h2>
         <Button className="" size="sm" onClick={()=>ExportData()} disabled={loading}>{loading?<Loader2 className='animate-spin' />:'Export'}</Button>

        </div>
    </div>
  )
}

export default FormListResponse