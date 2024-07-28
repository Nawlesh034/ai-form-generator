import React from 'react'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Themes from '@/app/_data/Themes'
import { Checkbox } from "@/components/ui/checkbox"

//selectedTheme goes to parent component

function Controller({selectedTheme,setSignInEnable}) {
    return (
        <div><h2>Select Themes</h2>
            <Select onValueChange={(value)=>selectedTheme(value)}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a Theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {Themes.map((theme, index) => (<SelectItem value={theme.name} key={index}>
                            <div className='flex gap-1'>
                                <div className='h-5 w-5' style={{ backgroundColor: theme.primary }}>


                                </div>
                                <div className='h-5 w-5' style={{ backgroundColor: theme.secondary }}>


                                </div>
                                <div className='h-5 w-5' style={{ backgroundColor: theme.accent }}>


                                </div>
                                <div className='h-5 w-5' style={{ backgroundColor: theme.neutral }}>


                                </div>
                                
                                {theme.name}
                            </div></SelectItem>))}



                    </SelectGroup>
                </SelectContent>
            </Select>
            {/**Background Selection Controller */}
            <h2 className='mt-8 my-1'>Bakground</h2>
            <div>
                
            </div>
            <div className='flex gap-2 my-4 items-center mt-10'>
                <Checkbox  onCheckedChange={(e)=>setSignInEnable(e)}/><h2>Enable Social Authentication Before Submit the form</h2>
            </div>
        </div>
    )
}

export default Controller