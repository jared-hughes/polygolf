# Some simple programs

## Hello, world

```polygolf
print "Hello, World!";
```

```lua
print("Hello, World!")
```

```nim
echo"Hello, World!"
```

```python
print("Hello, World!")
```

## Print integers x, 0 <= x < 100

```polygolf
for $i 0 100 (println $i);
```

```lua
for i=0,99 do print(i)end
```

```nim
for i in..99:i.echo
```

```python
for i in range(100):print(i)
```

## Output the first input

```polygolf
print (argv_get 0);
```

```lua
print(arg[1])
```

```nim
import os
1.paramStr.echo
```

```python
import sys
print(sys.argv[1])
```

## Print a right triangle of stars

```polygolf
for $i 1 11 {
    println (repeat "*" $i);
};
```

```lua
for i=1,10 do print(("*"):rep(i))end
```

```nim
include re
for i in 1..10:echo "*".repeat i
```

```python
import sys
for i in range(1,11):print("*"*i)
```
