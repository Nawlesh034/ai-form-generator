import { Input } from '@/components/ui/input'
import React, { useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import FieldEdit from './FieldEdit'
import { JsonForms, userResponse } from '@/config/schema'
import { db } from '@/config'
import moment from 'moment'
import { toast } from 'sonner'
import { eq  } from 'drizzle-orm'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'


function FormUi({jsonform,selectedTheme,onFieldUpdate,deleteField,editable=true,formId, enableSignIn=false}) {
  
  const[formData,setFormData]=useState();
  let formRef=useRef()  //you can refer to the dom element
  const{user,isSignedIn}=useUser()
  
  const handleInputChange=(e)=>{
    const{name,value}=e.target
    setFormData({...formData,[name]:value})
  }
  const handleSelect=(name,value)=>{
    setFormData({...formData,[name]:value})

  }
  const handleCheckboxChange = (name, option,value) => {
    const list=formData?.[name]?formData?.[name]:[];

    if(value){
      list.push({
        label:option,
        value:value
      })
      setFormData({
        ...formData,
        [name]:list
      })
    }else{
      const result=list.filter((item)=>item.label==option);
      setFormData({
        ...formData,
        [name]:result
      })
    }
    
  }
  const onFormSubmit=async(e)=>{
    e.preventDefault()
    console.log(formData)
 

    const formExists = await db.select().from(JsonForms)
    .where(eq(JsonForms.id, formId));

    if (!formExists || formExists.length === 0) {
        toast('Form ID does not exist!');
        return;
    }
   
    const result=await db.insert(userResponse)
    .values({
      jsonResponse:JSON.stringify(formData),
      CreatedAt: moment().format('DD/MM/yyyy'),
      refForm:formId,
    })
    console.log(formId)
    if(result){
      formRef.reset();
      toast('Response Submitted Successfully!')
    }
    else{
      toast("Internal Error!!")
    }
  }
  return (
    <form

    ref={(e)=>formRef=e}
      onSubmit={onFormSubmit}
    className='border rounded-lg p-5 md:w-[600px] 'data-theme={selectedTheme}><h2 className='font-bold text-center text-2xl'>{jsonform?.formTitle}</h2>
    <h2 className='text-sm text-gray-400 text-center'>{jsonform?.formSubheading}</h2>
    {jsonform && jsonform.formFields && Array.isArray(jsonform?.formFields) ? (
  jsonform.formFields.map((field, index) => (
    <div key={index} className=' '>
      <div className=' px-1 py-1'>
        <label className='text-sm text-gray-600'>{field.fieldLabel}</label>
       {field.fieldType === 'select' ? (
  <Select onValueChange={(value) => handleSelect(field.fieldLabel, value)}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder={field.placeholder || "Select an option"} />
    </SelectTrigger>
    <SelectContent>
      {Array.isArray(field.options) &&
        field.options.map((option, optIndex) => (
          <SelectItem key={optIndex} value={option}>
            {option}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
        ) : field.fieldType === 'radio' ? (
          <RadioGroup defaultValue={field.options?.[0]?.value}
          onValueChange={(value) => handleSelect(field.fieldName, value)}   >
            {Array.isArray(field.options) &&
              field.options.map((option, optIndex) => (
                <div key={optIndex} className='flex items-center space-x-2'>
                  <RadioGroupItem value={option} id={`option-${index}-${optIndex}`}  />
                  <Label htmlFor={`option-${index}-${optIndex}`}>{option}</Label>
                </div>
              ))}
          </RadioGroup>
        ) : field.fieldType === 'checkbox' ? (
          <div>
            {Array.isArray(field.options) ? (
              field.options.map((option, optIndex) => (
                <div key={optIndex} className='flex items-center space-x-2'>
                  <Checkbox id={`checkbox-${index}-${optIndex}`} value={option} onCheckedChange={(v)=>handleCheckboxChange(field.fieldName, option, v)} />
                  <Label htmlFor={`checkbox-${index}-${optIndex}`}>{option}</Label>
                </div>
              ))
            ) : (
              <div className='flex items-center space-x-2'>
                <Checkbox id={`checkbox-${index}`} onCheckedChange={(v)=>handleCheckboxChange(field.fieldName, field.fieldLabel, v)} />
                <Label htmlFor={`checkbox-${index}`}>{field.fieldLabel}</Label>
              </div>
            )}
          </div>
        ) : field.fieldType === 'date' ? (
         <Input type={field.fieldType}
           name={field.fieldName}
           placeholder={field.placeholder}
           onChange={(e)=>handleInputChange(e)}
         />
        ) : field.fieldType === 'file' ? (
          <Input type={field.fieldType} name={field.fieldName} onChange={(e)=>handleInputChange(e)} />
        ) : (
          <Input type={field.fieldType} placeholder={field.placeholder} name={field.fieldName} onChange={(e)=>handleInputChange(e)} />
        )}
      </div>
      {editable &&
      <div>
       <FieldEdit defaultValue={field} onUpdate={(value) => onFieldUpdate(value, index)} deleteField={() => deleteField(index)} />
      </div>
}
    </div>
  ))
) : (
  <div>No form data available</div>
)}{!enableSignIn? <button className='btn btn-primary' type='submit'>Submit</button>:isSignedIn?<button className='btn btn-primary' type='submit'>Submit</button>  :<Button><SignInButton mode='modal'>Sign In Before Submit</SignInButton></Button>}

    </form>
  )
}

export default FormUi
