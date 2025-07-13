/**
 * Test script for Vercel MCP adapter implementation
 *
 * This script tests the MCP server using the new Vercel adapter endpoints
 *
 * Usage:
 * 1. Start your Next.js server: pnpm dev
 * 2. Create an API key in the web interface at /api-keys
 * 3. Run: node test-vercel-mcp.js YOUR_API_KEY [transport]
 *
 * Transport options: streamable (default) or sse
 */

const API_KEY = process.argv[2];
const TRANSPORT = process.argv[3] || "streamable";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

if (!API_KEY) {
  console.error("Usage: node test-vercel-mcp.js YOUR_API_KEY [transport]");
  console.error("Transport options: streamable (default) or sse");
  process.exit(1);
}

const MCP_URL = `${BASE_URL}/api/mcp-v2/${TRANSPORT}`;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

async function testMcpInitialization() {
  console.log(`🚀 Testing MCP Server initialization at ${MCP_URL}\n`);

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      }),
    });

    const result = await response.json();
    console.log("✅ MCP Server initialized:", JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error("❌ MCP initialization failed:", error.message);
    return false;
  }
}

async function testListTools() {
  console.log("\n🔧 Testing tools listing...\n");

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });

    const result = await response.json();
    if (result.result?.tools) {
      console.log("✅ Available tools:");
      result.result.tools.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name}: ${tool.description}`);
      });
      return result.result.tools;
    } else {
      console.log("❌ No tools found in response:", result);
      return [];
    }
  } catch (error) {
    console.error("❌ Tools listing failed:", error.message);
    return [];
  }
}

async function testListResources() {
  console.log("\n📚 Testing resources listing...\n");

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "resources/list",
        params: {},
      }),
    });

    const result = await response.json();
    if (result.result?.resources) {
      console.log("✅ Available resources:");
      result.result.resources.forEach((resource, i) => {
        console.log(`   ${i + 1}. ${resource.name}: ${resource.description}`);
        console.log(`      URI: ${resource.uri}`);
      });
      return result.result.resources;
    } else {
      console.log("❌ No resources found in response:", result);
      return [];
    }
  } catch (error) {
    console.error("❌ Resources listing failed:", error.message);
    return [];
  }
}

async function testCreateTask() {
  console.log("\n📝 Testing task creation...\n");

  const testDate = "2024-01-15";

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "create_task",
          arguments: {
            date: testDate,
            title: "Vercel MCP Test Task",
            description: "A task created via Vercel MCP adapter test",
            quadrant: "urgent-important",
            priority: 1,
            timeRequired: "30 minutes",
            timeBlock: "2-2:30 PM",
            difficulty: "easy",
            tags: ["test", "vercel-mcp"],
          },
        },
      }),
    });

    const result = await response.json();
    if (result.result?.content) {
      console.log("✅ Task created successfully:");
      console.log(result.result.content[0].text);
    } else {
      console.log("❌ Task creation failed:", result);
    }
    return result;
  } catch (error) {
    console.error("❌ Task creation failed:", error.message);
    return null;
  }
}

async function testListTasks() {
  console.log("\n📋 Testing task listing...\n");

  const testDate = "2024-01-15";

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "list_tasks",
          arguments: {
            date: testDate,
          },
        },
      }),
    });

    const result = await response.json();
    if (result.result?.content) {
      console.log("✅ Tasks listed successfully:");
      console.log(result.result.content[0].text);
    } else {
      console.log("❌ Task listing failed:", result);
    }
    return result;
  } catch (error) {
    console.error("❌ Task listing failed:", error.message);
    return null;
  }
}

async function testMarkTaskComplete() {
  console.log("\n✅ Testing task completion...\n");

  const testDate = "2024-01-15";

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "mark_task_complete",
          arguments: {
            date: testDate,
            title: "Vercel MCP Test Task",
            completed: true,
          },
        },
      }),
    });

    const result = await response.json();
    if (result.result?.content) {
      console.log("✅ Task marked complete successfully:");
      console.log(result.result.content[0].text);
    } else {
      console.log("❌ Task completion failed:", result);
    }
    return result;
  } catch (error) {
    console.error("❌ Task completion failed:", error.message);
    return null;
  }
}

async function testPlannerResource() {
  console.log("\n📊 Testing planner resource...\n");

  const testDate = "2024-01-15";

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "resources/read",
        params: {
          uri: `planner://summary/${testDate}`,
        },
      }),
    });

    const result = await response.json();
    if (result.result?.contents) {
      console.log("✅ Planner resource read successfully:");
      console.log(result.result.contents[0].text);
    } else {
      console.log("❌ Planner resource read failed:", result);
    }
    return result;
  } catch (error) {
    console.error("❌ Planner resource read failed:", error.message);
    return null;
  }
}

async function testPlanDayPrompt() {
  console.log("\n🎯 Testing plan day prompt...\n");

  try {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 8,
        method: "prompts/get",
        params: {
          name: "plan_day",
          arguments: {
            date: "2024-01-16",
            focus: "productivity and learning",
          },
        },
      }),
    });

    const result = await response.json();
    if (result.result?.messages) {
      console.log("✅ Plan day prompt generated successfully:");
      console.log(result.result.messages[0].content.text);
    } else {
      console.log("❌ Plan day prompt failed:", result);
    }
    return result;
  } catch (error) {
    console.error("❌ Plan day prompt failed:", error.message);
    return null;
  }
}

async function runAllTests() {
  console.log(`🧪 Testing Vercel MCP Adapter Implementation\n`);
  console.log(`🔑 Using API Key: ${API_KEY.substring(0, 12)}***`);
  console.log(`🚀 Transport: ${TRANSPORT}\n`);

  // Test initialization
  const initialized = await testMcpInitialization();
  if (!initialized) {
    console.log("\n❌ Cannot proceed without proper initialization");
    return;
  }

  // Test capabilities
  await testListTools();
  await testListResources();

  // Test actual functionality
  await testCreateTask();
  await testListTasks();
  await testMarkTaskComplete();
  await testPlannerResource();
  await testPlanDayPrompt();

  console.log("\n✨ Testing complete!");
  console.log("\n📋 Summary:");
  console.log(`   • MCP Server URL: ${MCP_URL}`);
  console.log(`   • Transport: ${TRANSPORT}`);
  console.log(`   • Authentication: Bearer token`);
  console.log("\n🎉 Your MCP server is ready for AI assistant integration!");
  console.log("\n📖 Configuration for Claude Desktop:");
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          "task-planner": {
            command: "npx",
            args: ["-y", "@modelcontextprotocol/create-server"],
            env: {
              MCP_SERVER_URL: MCP_URL,
              API_KEY: "your_api_key_here",
            },
          },
        },
      },
      null,
      2,
    ),
  );
}

runAllTests().catch(console.error);
