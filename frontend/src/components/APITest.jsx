import { useState } from "react";
import { Button } from "@/components/ui/button.jsx";
import { authAPI } from "@/services/api.js";

const APITest = () => {
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setTestResult("Testing connection...");

    try {
      // Test basic connection
      const response = await fetch("http://localhost:3001/api/health");
      const data = await response.json();

      if (response.ok) {
        setTestResult(`✅ Backend is running! Status: ${data.status}`);
      } else {
        setTestResult(`❌ Backend responded with error: ${response.status}`);
      }
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSignup = async () => {
    setLoading(true);
    setTestResult("Testing signup API...");

    try {
      const testUser = {
        fullName: "Test User",
        email: `test${Date.now()}@example.com`,
        phone: "01000000000",
        password: "testpassword123",
        passwordConfirm: "testpassword123",
      };

      const response = await authAPI.signup(testUser);
      setTestResult(
        `✅ Signup test successful! User created: ${response.data?.user?.email}`
      );
    } catch (error) {
      setTestResult(`❌ Signup test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">API Connection Test</h2>

      <div className="space-y-4">
        <Button onClick={testConnection} disabled={loading} className="w-full">
          {loading ? "Testing..." : "Test Backend Connection"}
        </Button>

        <Button
          onClick={testSignup}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? "Testing..." : "Test Signup API"}
        </Button>

        {testResult && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm font-mono">{testResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APITest;

