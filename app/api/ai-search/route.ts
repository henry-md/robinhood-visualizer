import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Transaction {
  postingDate: string;
  description: string;
  amount: number;
  type: string;
  balance: number | null;
  timestamp: number;
  category?: string;
}

interface AISearchRequest {
  query: string;
  transactions: Transaction[];
}

interface AISearchResponse {
  indices: number[];
  message?: string;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AISearchRequest;
    const { query, transactions } = body;

    if (!query || !transactions || transactions.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Prepare transaction data for the AI (with indices)
    const transactionList = transactions.map((t, index) => ({
      index,
      date: t.postingDate,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category || 'Uncategorized',
    }));

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `You are helping a user search through their financial transactions. Based on the search query, return the indices of transactions that match.

Search Query: "${query}"

Transactions:
${JSON.stringify(transactionList, null, 2)}

Instructions:
- Return the indices of transactions that match the search query
- Be intelligent about matching - consider semantics, not just keywords
- For amount queries, understand natural language like "over $500", "large purchases", "small charges"
- For date queries, understand relative dates like "last month", "this week", "December"
- For category queries, infer categories from descriptions (e.g., "dining" could match restaurants, food delivery)
- You can include an optional message to explain your reasoning or provide insights to the user
- Only include a message if it adds value (e.g., to clarify ambiguous queries, highlight patterns, or explain edge cases)`,
      }],
      tools: [{
        type: 'function',
        function: {
          name: 'filter_transactions',
          description: 'Filter and return transaction indices that match the user\'s search query. You can also provide an optional message to explain your filtering or provide insights.',
          parameters: {
            type: 'object',
            properties: {
              indices: {
                type: 'array',
                items: { type: 'number' },
                description: 'Array of transaction indices that match the search criteria',
              },
              message: {
                type: 'string',
                description: 'Optional message to display to the user, such as insights, explanations, or clarifications about the search results',
              },
            },
            required: ['indices'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'filter_transactions' } },
    });

    // Extract tool call result
    const toolCall = response.choices[0]?.message?.tool_calls?.[0];

    if (!toolCall || !toolCall.function.arguments) {
      return NextResponse.json({ error: 'No tool call in response' }, { status: 500 });
    }

    const result = JSON.parse(toolCall.function.arguments) as AISearchResponse;

    return NextResponse.json({
      indices: result.indices || [],
      message: result.message,
    });
  } catch (error) {
    console.error('Error in AI search:', error);
    return NextResponse.json({ error: 'Failed to perform AI search' }, { status: 500 });
  }
}
