/**
 * medium_bugs.cpp – Sample C++ file with MEDIUM severity bugs
 *
 * Bugs present:
 *   - Buffer overflow (strcpy without bounds check)
 *   - Null pointer dereference
 *   - Memory leak (new without delete)
 *   - Use-after-free
 *   - Uninitialized variable usage
 *   - Array out-of-bounds access
 */

#include <iostream>
#include <cstring>
#include <cstdlib>

class UserProfile {
public:
    char name[32];
    int age;
    char *bio;

    UserProfile(const char *n, int a) {
        /* Bug: strcpy without bounds checking – buffer overflow if n > 31 chars */
        strcpy(name, n);
        age = a;
        bio = nullptr;
    }

    void setBio(const char *text) {
        bio = new char[strlen(text) + 1];
        strcpy(bio, text);
    }

    void printProfile() {
        std::cout << "Name: " << name << std::endl;
        std::cout << "Age: " << age << std::endl;
        /* Bug: null pointer dereference if setBio() was never called */
        std::cout << "Bio: " << bio << std::endl;
    }

    ~UserProfile() {
        if (bio) delete[] bio;
    }
};

/* Bug: returns pointer to local stack variable */
int* createArray(int size) {
    int arr[100];
    for (int i = 0; i < size && i < 100; i++) {
        arr[i] = i * 10;
    }
    return arr;  /* Bug: returning pointer to local array (dangling pointer) */
}

void processData() {
    /* Bug: uninitialized variable used in condition */
    int status;
    if (status == 0) {
        std::cout << "Status is OK" << std::endl;
    }

    /* Bug: memory leak – allocated but never freed */
    int *numbers = new int[50];
    for (int i = 0; i < 50; i++) {
        numbers[i] = i;
    }
    std::cout << "Sum element: " << numbers[49] << std::endl;
    /* Missing: delete[] numbers; */

    /* Bug: use-after-free */
    char *temp = new char[20];
    strcpy(temp, "temporary data");
    delete[] temp;
    std::cout << "Temp: " << temp << std::endl;  /* Use after free! */

    /* Bug: array out-of-bounds */
    int scores[5] = {90, 85, 78, 92, 88};
    for (int i = 0; i <= 5; i++) {  /* Off-by-one: should be i < 5 */
        std::cout << "Score " << i << ": " << scores[i] << std::endl;
    }
}

int main() {
    UserProfile user("Alice", 25);
    user.printProfile();  /* Will crash: bio is null */

    user.setBio("Software developer who loves C++");
    user.printProfile();

    int *data = createArray(10);
    std::cout << "Data[0]: " << data[0] << std::endl;  /* Dangling pointer */

    processData();

    return 0;
}
