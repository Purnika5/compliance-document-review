# Caching Test Results

## Test 1 – First Request

Document ID: test-week2  
Version: 1

Result:
Cache miss

Status: PASS

## Test 2 – Same Document and Version

Document ID: test-week2  
Version: 1

Result:
Cache hit

Status: PASS

## Test 3 – New Document Version

Document ID: test-week2  
Version: 2

Result:
Cache miss

Status: PASS

## Conclusion

The AI service successfully caches analysis results using
document_id and version as the cache key.

Repeated requests for the same document version return the
cached analysis, while a new document version triggers a
fresh AI analysis.