/**
 * low_bugs.c - Sample C file with LOW severity bugs
 *
 * Bugs present:
 *   - Unused variable
 *   - Missing return value check
 *   - Implicit type conversion
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Calculate the average of an array */
double calculate_average(int *arr, int size) {
    int sum = 0;
    int unused_counter = 0;  /* Bug: unused variable */

    for (int i = 0; i < size; i++) {
        sum += arr[i];
    }

    /* Bug: integer division instead of floating-point division */
    double avg = sum / size;
    return avg;
}

/* Read a number from user */
int read_number() {
    int value;
    printf("Enter a number: ");
    scanf("%d", &value);  /* Bug: return value of scanf not checked */
    return value;
}

/* Print a greeting */
void greet(char *name) {
    char buffer[100];
    snprintf(buffer, sizeof(buffer), "Hello, %s! Welcome.", name);
    printf("%s\n", buffer);
}

int main() {
    int numbers[] = {10, 20, 30, 40, 50};
    int count = 5;

    double avg = calculate_average(numbers, count);
    printf("Average: %.2f\n", avg);

    int num = read_number();
    printf("You entered: %d\n", num);

    greet("World");

    /* Bug: malloc without checking NULL */
    int *data = malloc(count * sizeof(int));
    memcpy(data, numbers, count * sizeof(int));

    printf("First element copy: %d\n", data[0]);
    free(data);

    return 0;
}
