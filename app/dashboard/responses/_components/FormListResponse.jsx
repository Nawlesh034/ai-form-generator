import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { useFormResponses } from '@/app/_hooks/useFormResponses'
import ResponseDetails from './ResponseDetails'

function FormListResponse({formRecord,jsonform}) {

    const[loading,setLoading]=useState(false)
    const { responses, responseCount, loading: loadingCount, error, refreshResponses } = useFormResponses(formRecord?.id);
    console.log(jsonform,"nawlesh")

    const ExportData=async()=>{
        if (responseCount === 0) {
            alert('No responses to export');
            return;
        }

        setLoading(true);

        try {
            // Use the responses from the hook which are already parsed
            const jsonData = responses.map(item => item.parsedResponse);

            if (jsonData.length > 0) {
                exportToExcel(jsonData)
                console.log(`Exported ${jsonData.length} responses`)
            } else {
                alert('No valid responses found to export');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    /*convert Json to Excel and the download it*/

    const exportToExcel = (jsonData) => {
        const worksheet = XLSX.utils.json_to_sheet(jsonData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${jsonform?.formTitle || 'Form'}_responses.xlsx`);
    };
  return (
    <div className='border shadow-sm rounded-lg p-4'>
        
        <h2 className='text-lg text-black'>
          {jsonform?.formTitle}
        </h2>
        <h2 className='text-sm text-gray-500'>{jsonform?.formSubheading}</h2>
        <hr className='my-4'></hr>
        <div className='space-y-3'>
          <div className='flex justify-between items-center'>
            <h2 className='text-sm'>
              {loadingCount ? (
                <span className='flex items-center gap-1'>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  Loading...
                </span>
              ) : error ? (
                <span className='text-red-500'>Error loading responses</span>
              ) : (
                `${responseCount} Response${responseCount !== 1 ? 's' : ''}`
              )}
            </h2>
            <div className='flex gap-2'>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshResponses}
                disabled={loadingCount}
                className="flex gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loadingCount ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={()=>ExportData()}
                disabled={loading || responseCount === 0 || loadingCount || error}
              >
                {loading ? <Loader2 className='animate-spin' /> : 'Export'}
              </Button>
            </div>
          </div>

          {responseCount > 0 && (
            <div className='flex justify-center'>
              <ResponseDetails formRecord={formRecord} jsonform={jsonform} />
            </div>
          )}
        </div>
    </div>
  )
}

export default FormListResponse