'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import courseDetails from '../courseDetails'; // Import course details

const CourseDetails = () => {
  const params = useParams() as { course: string }; // Explicitly type params to ensure 'course' exists
  const router = useRouter(); // Use Next.js router for navigation
  const courseKey = params.course.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); // Format course key
  const courseInfo = courseDetails[courseKey] || {
    description: "Details for this course are not available.",
    careers: [],
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen px-8">
      <div className="bg-brown-1 shadow-lg rounded-lg p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center capitalize text-black">
          {courseKey}
        </h1>
        <p className="text-lg text-center text-black">{courseInfo.description}</p>
        {courseInfo.careers.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-4 text-black">Possible Career Paths:</h2>
            <ul className="list-disc list-inside text-black">
              {courseInfo.careers.map((career, index) => (
                <li key={index}>{career}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => router.push('/result#recommendations')}
            className="btn btn-primary bg-brown-6 border-brown-6 text-white rounded-lg text-xl px-8 py-3 hover:bg-brown-700 hover:border-brown-700"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
