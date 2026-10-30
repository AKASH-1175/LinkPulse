#!/usr/bin/env python3
"""
LinkPulse Load Testing Script
Simulates concurrent redirect visits to measure serverless throughput and latency.

Usage:
    python load_test.py <SHORT_URL> [REQUEST_COUNT] [--concurrency CONCURRENCY]

Example:
    python load_test.py http://localhost:8000/demo 200 --concurrency 20
"""

import sys
import time
import asyncio
import argparse
import statistics
from typing import List, Tuple
import httpx


async def send_redirect_request(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    url: str,
) -> Tuple[bool, float, int]:
    """
    Send an asynchronous GET request with follow_redirects=False.
    Returns (is_success, latency_ms, status_code).
    """
    async with semaphore:
        start = time.perf_counter()
        try:
            resp = await client.get(
                url,
                follow_redirects=False,
                headers={
                    "User-Agent": "LinkPulse-LoadTester/1.0 (Benchmarking Tool)",
                    "Referer": "https://loadtest.local",
                },
            )
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            # Success is defined as HTTP 302 redirect
            is_success = resp.status_code == 302
            return is_success, elapsed_ms, resp.status_code
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return False, elapsed_ms, 0


async def run_load_test(url: str, total_requests: int, concurrency: int) -> None:
    print(f"\n==========================================")
    print(f"       LinkPulse Serverless Load Test     ")
    print(f"==========================================")
    print(f"Target URL:    {url}")
    print(f"Total Requests: {total_requests}")
    print(f"Concurrency:   {concurrency}")
    print(f"Starting test...\n")

    semaphore = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency + 10, max_keepalive_connections=concurrency)

    wall_start = time.perf_counter()
    async with httpx.AsyncClient(limits=limits, timeout=30.0) as client:
        tasks = [
            send_redirect_request(client, semaphore, url)
            for _ in range(total_requests)
        ]
        results = await asyncio.gather(*tasks)

    wall_time = time.perf_counter() - wall_start

    # Process metrics
    latencies: List[float] = [r[1] for r in results]
    successes = [r for r in results if r[0]]
    success_count = len(successes)
    success_rate = (success_count / total_requests) * 100.0
    rps = total_requests / wall_time if wall_time > 0 else 0

    latencies.sort()
    p50 = statistics.median(latencies) if latencies else 0.0
    p95_idx = int(len(latencies) * 0.95)
    p95 = latencies[min(p95_idx, len(latencies) - 1)] if latencies else 0.0
    max_lat = max(latencies) if latencies else 0.0
    min_lat = min(latencies) if latencies else 0.0

    print("==========================================")
    print("               TEST RESULTS               ")
    print("==========================================")
    print(f"Total Time:      {wall_time:.3f} seconds")
    print(f"Throughput:      {rps:.2f} requests/sec")
    print(f"Successful (302): {success_count}/{total_requests} ({success_rate:.1f}%)")
    print(f"Min Latency:     {min_lat:.2f} ms")
    print(f"p50 (Median):    {p50:.2f} ms")
    print(f"p95 Latency:     {p95:.2f} ms")
    print(f"Max Latency:     {max_lat:.2f} ms")
    print("==========================================\n")


def main():
    parser = argparse.ArgumentParser(description="LinkPulse Serverless Redirect Load Tester")
    parser.add_argument("url", help="Target short URL (e.g. http://localhost:8000/demo)")
    parser.add_argument("n", nargs="?", type=int, default=200, help="Number of total requests (default: 200)")
    parser.add_argument("--concurrency", "-c", type=int, default=20, help="Concurrent workers (default: 20)")

    args = parser.parse_args()

    if args.n <= 0:
        print("Error: Number of requests must be greater than 0.")
        sys.exit(1)
    if args.concurrency <= 0:
        print("Error: Concurrency must be greater than 0.")
        sys.exit(1)

    asyncio.run(run_load_test(args.url, args.n, args.concurrency))


if __name__ == "__main__":
    main()
