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
        const data = await res.json();
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

  return (
    <div className='px-4'>
     <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
      </div>

      <ul className="mt-6 space-y-2">
        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> 10 users included </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> 2GB of storage </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> Email support </span>
        </li>

        <li className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-5 text-indigo-700"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>

          <span className="text-gray-700"> Help center access </span>
        </li>
      </ul>

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
