"use client"
import { useState, useEffect } from 'react';
import { db } from '@/config';
import { userResponse } from '@/config/schema';
import { eq } from 'drizzle-orm';

/**
 * Custom hook to manage form responses
 * @param {number} formId - The ID of the form to fetch responses for
 * @returns {Object} - Object containing response data and methods
 */
export const useFormResponses = (formId) => {
    const [responses, setResponses] = useState([]);
    const [responseCount, setResponseCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchResponses = async () => {
        if (!formId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const result = await db.select().from(userResponse)
                .where(eq(userResponse.refForm, formId));
            
            // Parse JSON responses and filter out invalid ones
            const validResponses = result
                .map(item => {
                    try {
                        return {
                            ...item,
                            parsedResponse: JSON.parse(item.jsonResponse)
                        };
                    } catch (parseError) {
                        console.error('Error parsing response:', parseError);
                        return null;
                    }
                })
                .filter(item => item !== null);

            setResponses(validResponses);
            setResponseCount(validResponses.length);
        } catch (error) {
            console.error("Error fetching responses:", error);
            setError("Failed to load responses.");
            setResponses([]);
            setResponseCount(0);
        } finally {
            setLoading(false);
        }
    };

    const refreshResponses = () => {
        fetchResponses();
    };

    useEffect(() => {
        fetchResponses();
    }, [formId]);

    return {
        responses,
        responseCount,
        loading,
        error,
        refreshResponses
    };
};

/**
 * Custom hook to get just the response count (lighter weight)
 * @param {number} formId - The ID of the form to count responses for
 * @returns {Object} - Object containing count and loading state
 */
export const useResponseCount = (formId) => {
    const [responseCount, setResponseCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCount = async () => {
        if (!formId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const result = await db.select().from(userResponse)
                .where(eq(userResponse.refForm, formId));
            
            setResponseCount(result.length);
        } catch (error) {
            console.error("Error fetching response count:", error);
            setError("Failed to load response count.");
            setResponseCount(0);
        } finally {
            setLoading(false);
        }
    };

    const refreshCount = () => {
        fetchCount();
    };

    useEffect(() => {
        fetchCount();
    }, [formId]);

    return {
        responseCount,
        loading,
        error,
        refreshCount
    };
};
