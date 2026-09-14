"use client"
import PricingPlan from '@/app/_data/PricingPlan'
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

function Upgrade() {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const [loadingPriceId, setLoadingPriceId] = useState(null);

    useEffect(() => {
      if (searchParams.get('success') !== 'true' || !user) return;

      let cancelled = false;

      const pollForPlanUpdate = async () => {
        for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
          await user.reload();
          if (user.publicMetadata?.plan === 'paid') break;
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        if (cancelled) return;
        if (user.publicMetadata?.plan === 'paid') {
          toast.success('Your plan has been activated!');
        } else {
          toast('Payment received — activating your plan. This can take a few seconds; refresh if it doesn\'t update.');
        }
      };

      pollForPlanUpdate();

      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, user?.id]);

    const startCheckout = async (priceId) => {
      setLoadingPriceId(priceId);
      try {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId }),
        });
        console.log(res,"response on money")
        const data = await res.json();
        console.log(data,"data on money page")
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
        toast.error(data?.error || 'Could not start checkout. Please try again.');
        setLoadingPriceId(null);
      } catch (err) {
        toast.error('Something went wrong. Please check your connection and try again.');
        setLoadingPriceId(null);
      }
    };

  const isPaid = user?.publicMetadata?.plan === 'paid';
  console.log(isPaid,"money")

  return (
    <div className='px-4'>
     <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
  <div className='mb-6 border shadow-sm rounded-lg p-4 flex items-center justify-between'>
    <span className='text-sm text-gray-600'>Current plan</span>
    <span className={`text-sm font-semibold ${isPaid ? 'text-green-600' : 'text-gray-800'}`}>
      {isPaid ? `${user.publicMetadata.formLimit} Forms Paid Plan` : 'Free'}
    </span>
  </div>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center md:gap-8">
   {PricingPlan.map((item)=>(<div key={item.priceId} className="rounded-2xl border border-gray-200 p-6 shadow-sm sm:px-8 lg:p-12">
      <div className="text-center">
        <h2 className="text-lg font-medium text-gray-900">
          {item.duration}
          <span className="sr-only">Plan</span>
        </h2>

        <p className="mt-2 sm:mt-4">
          <strong className="text-3xl font-bold text-gray-900 sm:text-4xl"> {item.price} </strong>

          <span className="text-sm font-medium text-gray-700">{item.duration}</span>
        </p>
        <p className="font-medium ">{item.formLimit} Forms</p>
      </div>

     

      <button
        onClick={() => startCheckout(item.priceId)}
        disabled={loadingPriceId === item.priceId}
        className="mt-8 block w-full rounded-full border border-indigo-600 bg-white px-12 py-3 text-center text-sm font-medium text-indigo-600 hover:ring-1 hover:ring-indigo-600 focus:outline-none focus:ring active:text-indigo-500 disabled:opacity-50"
      >
        {loadingPriceId === item.priceId ? 'Redirecting…' : 'Get Started'}
      </button>
    </div>))}


  </div>
</div>
    </div>
  )
}

export default Upgrade
