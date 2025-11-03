from passlib.hash import bcrypt

hashed = bcrypt.hash("IceCream#(")
print("Hashed password:", hashed)
p = "IceCream#(0"
is_valid = bcrypt.verify("IceCream#(", hashed)
print("Password is valid:", is_valid)

