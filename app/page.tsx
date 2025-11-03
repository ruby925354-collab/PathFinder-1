'use client'
import React from 'react'
import '../app/css/base.css'
import '../app/css/sandbox.css'
import '../app/css/embla.css'
import Header from "@/app/sections/Header";
import Body from "@/app/sections/Body";
import Rating from "@/app/sections/Rating";
import Ending from '@/app/sections/Ending';
import EmblaCarousel from '@/app/users/EmblaCarousel'
import { EmblaOptionsType } from 'embla-carousel'

const OPTIONS: EmblaOptionsType = { dragFree: true, loop: true }
const SLIDE_COUNT = 5
const SLIDES = Array.from(Array(SLIDE_COUNT).keys())

export default function Home() {
  return (
    <>
    
    <Header />
    <Body />
    <div className='mt-30 m-10'></div>
    <EmblaCarousel slides={SLIDES} options={OPTIONS} />
    <Ending />
  
    </>
  )
}
