// Should transform
!array.includes(value);
!array.includes(value);

array.includes(value);
array.includes(value);

!array.includes(value);
!array.includes(value);

array.includes(value);
array.includes(value);

array.includes(value);
array.includes(value);

// Should not transform
array.indexOf(value) <= 0;
0 >= array.indexOf(value);

array.indexOf(value) > 0;
0 < array.indexOf(value);

array.indexOf(value) >= -1;
-1 <= array.indexOf(value);

array.indexOf(value) === 1;
1 === array.indexOf(value);

array.indexOf(value);
