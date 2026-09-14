"use client"
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { db } from '@/config';
import { JsonForms } from '@/config/schema';
import { useUser } from '@clerk/nextjs';
import { desc, eq } from 'drizzle-orm';
import { BarChart2, LibraryBig, MessageSquareQuote, Plus } from 'lucide-react'
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { extractJson } from '@/lib/utils'
import { FREE_FORM_LIMIT } from '@/app/_data/PricingPlan'

export default function SideNav({ onNavigate,onClose }) {
    const menuList=[
        {
            id:1,
            name:'My Forms',
            icon:LibraryBig,
            path:'/dashboard'
        },
        {
            id:1,
            name:'Responses',
            icon:MessageSquareQuote,
            path:'/dashboard/responses'
        },
        {
            id:1,
            name:'Analytics',
            icon:BarChart2,
            path:'/dashboard/analytics'
        },
        {
            id:1,
            name:'Upgrade',
            icon:Plus,
            path:'/dashboard/upgrade'
        },

    ]
    const {user}=useUser();
    const path =usePathname();
    const[formList,setFormList]=useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [Percentage,setPercentage]=useState(0)
    const limit = user?.publicMetadata?.formLimit ?? FREE_FORM_LIMIT;

    const getFormList = async () => {
        try {
            const result = await db.select().from(JsonForms)
                .where(eq(JsonForms.CreatedBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(desc(JsonForms.id));

            const perc=(result.length/limit)*100;
            setPercentage(perc)

            const cleanedForms = result.map(form => {
                const parsedJson = extractJson(form.jsonForm);
                return {
                    ...form,
                    jsonForm: parsedJson
                };
            }).filter(form => form.jsonForm !== null);

            setFormList(cleanedForms);
        } catch (error) {
            console.error("Error fetching forms:", error);
            setError("Failed to load forms.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{
       if(user){
        getFormList()
       }
    },[user])

     const handleNavigate = () => {
    // Parent handler
    onNavigate?.();

    // Mobile drawer close
    onClose?.();
  };
  return (
    <aside
      className="
        flex h-full w-full flex-col
        border-r bg-white p-4 shadow-sm
        md:h-screen md:w-64 md:p-5
      "
    >
      {/* Mobile Header */}
      <div className="mb-5 flex items-center justify-between md:hidden">
        <h2 className="text-lg font-semibold">Menu</h2>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {menuList.map((menu) => {
          const Icon = menu.icon;
          const isActive = path === menu.path;

          return (
            <Link
              href={menu.path}
              key={menu.id}
              onClick={handleNavigate}
              className={`
                mb-2 flex items-center gap-3 rounded-lg p-3
                transition-colors
                ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:bg-primary hover:text-white"
                }
              `}
            >
              <Icon size={20} />
              <span className="text-sm font-medium sm:text-base">
                {menu.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="mt-6 border-t pt-5">
        <Button className="w-full">
          <Plus size={18} className="mr-2" />
          Create Form
        </Button>

        <div className="mt-5">
          <Progress value={Percentage} />

          <p className="mt-2 text-sm text-gray-700">
            <strong>{formList.length}</strong> out of{" "}
            <strong>{limit}</strong> forms created
          </p>

          {user?.publicMetadata?.plan !== "paid" && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              Upgrade your plan for unlimited AI form building.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
    
  
}
