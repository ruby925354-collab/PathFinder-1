import React from 'react'

const Rating = () => {
  return (
    <div className="stats stats-vertical md:stats-horizontal lg:stats-horizontal shadow items-center mt-0 md:mt-2 lg:mt-28 mb-0 md:mb-0 lg:mb-36 ml-0 lg:ml-44 mr-0 lg:mr-44 lg:h-40 w-full md:w-[770px] lg:w-[1155px] bg-white">
      <div className="stat">
        <div className="stat-figure text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block h-10 w-10 stroke-current text-black">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="stat-title text-black text-2xl">Downloads</div>
        <div className="stat-value text-black text-5xl">31K</div>
        <div className="stat-desc text-black text-xl">Jan 1st - Feb 1st</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block h-10 w-10 stroke-current text-black">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
        </div>
        <div className="stat-title text-black text-2xl">New Users</div>
        <div className="stat-value text-black text-5xl">4,200</div>
        <div className="stat-desc text-black text-xl">↗︎ 400 (22%)</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block h-10 w-10 text-black stroke-current">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
        </div>
        <div className="stat-title text-black text-2xl">New Registers</div>
        <div className="stat-value text-black text-5xl">1,200</div>
        <div className="stat-desc  text-black text-xl">↘︎ 90 (14%)</div>
      </div>
    </div>
  )
}

export default Rating
