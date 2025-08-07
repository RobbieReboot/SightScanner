---
description: 'Python coding conventions and guidelines'
applyTo: '**/*.py'
---

# Python Coding Conventions

## Python Instructions

- Write clear and concise comments for each function.
- Ensure functions have descriptive names and include type hints.
- Provide docstrings following PEP 257 conventions.
- Use the `typing` module for type annotations (e.g., `List[str]`, `Dict[str, int]`).
- Break down complex functions into smaller, more manageable functions.

## General Instructions

- Always prioritize readability and clarity.
- For algorithm-related code, include explanations of the approach used.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Handle edge cases and write clear exception handling.
- For libraries or external dependencies, mention their usage and purpose in comments.
- Use consistent naming conventions and follow language-specific best practices.
- Write concise, efficient, and idiomatic code that is also easily understandable.

## Code Style and Formatting

- Follow the **PEP 8** style guide for Python.
- Maintain proper indentation (use 4 spaces for each level of indentation).
- Ensure lines do not exceed 79 characters.
- Place function and class docstrings immediately after the `def` or `class` keyword.
- Use blank lines to separate functions, classes, and code blocks where appropriate.

## FastAPI Specific Guidelines

- Use type hints for all function parameters and return values
- Follow PEP 8 naming conventions
- Use Pydantic models for data validation
- Implement proper error handling with HTTPException
- Add comprehensive docstrings for API endpoints
- Use async/await for I/O operations

### API Endpoint Pattern

```python
@app.post("/endpoint", response_model=ResponseModel, tags=["category"])
async def endpoint_function(request: RequestModel):
    """
    Comprehensive docstring explaining:
    - What the endpoint does
    - Parameters and their types
    - Return value and structure
    - Possible errors
    """
    try:
        # Implementation
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Error Handling

- Use proper HTTP status codes (400, 404, 500, etc.)
- Provide descriptive error messages
- Log errors appropriately for debugging

### Security Guidelines

- Validate all file uploads (type, size, content)
- Sanitize user inputs
- Use environment variables for sensitive configuration

## Edge Cases and Testing

- Always include test cases for critical paths of the application.
- Account for common edge cases like empty inputs, invalid data types, and large datasets.
- Include comments for edge cases and the expected behavior in those cases.
- Write unit tests for functions and document them with docstrings explaining the test cases.

## Example of Proper Documentation

```python
def calculate_area(radius: float) -> float:
    """
    Calculate the area of a circle given the radius.
    
    Parameters:
    radius (float): The radius of the circle.
    
    Returns:
    float: The area of the circle, calculated as π * radius^2.
    """
    import math
    return math.pi * radius ** 2
```