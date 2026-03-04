#include <stdio.h>
char input[100];
int pos = 0, length, error = 0; 
void E();
void Eprime();
void match(char expected);
void match(char expected) {
    if (input[pos] == expected) {
        pos++;
    } else {
        printf("Error: Unexpected symbol '%c' at position %d\n", input[pos], pos);
        error = 1;
    }
}
/* E -> iE' */
void E() {
    if (input[pos] == 'i') {
        match('i');
        Eprime();
    } else {
        printf("Error: Expected 'i' at position %d\n", pos);
        error = 1;
    }
}
/* E' -> +iE' | epsilon */
void Eprime() {
    if (input[pos] == '+') {
        match('+');
        if (input[pos] == 'i') {
            match('i');
            Eprime();
        } else {
            printf("Error: Expected 'i' after '+' at position %d\n", pos);
            error = 1;
        }
    }
    /* else epsilon */
}
int main() {
    printf("Enter input string: ");
    scanf("%s", input);
    length = strlen(input);
    E();
    if (!error && pos == length) {
        printf("String Accepted\n");
    } else {
        printf("String Rejected\n");
    }
    return 0;
}