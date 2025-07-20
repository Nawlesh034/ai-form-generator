"use client"
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Calendar, User } from 'lucide-react';
import { useFormResponses } from '@/app/_hooks/useFormResponses';
import moment from 'moment';

function ResponseDetails({ formRecord, jsonform }) {
  const [isOpen, setIsOpen] = useState(false);
  const { responses, loading, error } = useFormResponses(formRecord?.id);

  const formatResponseValue = (value) => {
    if (Array.isArray(value)) {
      return value.map(item => 
        typeof item === 'object' ? item.label || item.value || JSON.stringify(item) : item
      ).join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return value?.toString() || 'No response';
  };

  const getFieldLabel = (fieldName) => {
    if (!jsonform?.formFields) return fieldName;
    
    const field = jsonform.formFields.find(f => 
      f.fieldName === fieldName || f.fieldLabel === fieldName
    );
    return field?.fieldLabel || fieldName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex gap-2">
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Response Details - {jsonform?.formTitle}
          </DialogTitle>
          <DialogDescription>
            {jsonform?.formSubheading}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading responses...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading responses: {error}</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No responses found for this form.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total Responses: {responses.length}
                </h3>
              </div>

              {responses.map((response, index) => (
                <div key={response.id || index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-medium text-gray-900">
                      Response #{index + 1}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {response.CreatedBy && response.CreatedBy !== 'anonymous' && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {response.CreatedBy}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {moment(response.CreatedAt, 'DD/MM/YYYY').format('MMM DD, YYYY') || 'Unknown date'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {response.parsedResponse && typeof response.parsedResponse === 'object' ? (
                      Object.entries(response.parsedResponse).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">
                            {getFieldLabel(key)}
                          </label>
                          <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                            {formatResponseValue(value)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">Response</label>
                        <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {JSON.stringify(response.parsedResponse)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ResponseDetails;
