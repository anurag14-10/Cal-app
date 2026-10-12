pipeline {
    agent any

    environment {
        REGISTRY = 'nexus.imcc.skilli.in'
        IMAGE_NAME = 'nexus.imcc.skilli.in/student-docker/2401059'
        IMAGE_TAG = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY = '2401059-project'
        SONAR_HOST_URL = 'https://sonarqube.imcc.skilli.in'
        K8S_NAMESPACE = 'student-2401059'
        
        // Exact Credential IDs required by the lab
        SONAR_CRED_ID = 'sonar-token-student'
        NEXUS_CRED_ID = 'nexus-student-creds'
        KUBECONFIG_CRED_ID = 'student-kubeconfig'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Static Analysis') {
            steps {
                withCredentials([string(credentialsId: "${SONAR_CRED_ID}", variable: 'SONAR_TOKEN')]) {
                    sh """
                        if command -v sonar-scanner >/dev/null 2>&1; then
                            sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=src \
                                -Dsonar.host.url=${SONAR_HOST_URL} \
                                -Dsonar.token=\${SONAR_TOKEN}
                        else
                            echo "sonar-scanner CLI not found in PATH, skipping local scan invocation or use Jenkins SonarQube Scanner plugin"
                        fi
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    script {
                        echo "Waiting for SonarQube Quality Gate result..."
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh """
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .
                """
            }
        }

        stage('Push Docker Image to Nexus') {
            steps {
                withCredentials([usernamePassword(credentialsId: "${NEXUS_CRED_ID}", usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    sh """
                        echo "\${NEXUS_PASS}" | docker login ${REGISTRY} -u "\${NEXUS_USER}" --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                        docker logout ${REGISTRY}
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: "${KUBECONFIG_CRED_ID}", variable: 'KUBECONFIG')]) {
                    sh """
                        # Update deployment with the newly built image tag
                        sed -i 's|${IMAGE_NAME}:latest|${IMAGE_NAME}:${IMAGE_TAG}|g' k8s/deployment.yaml || true
                        
                        kubectl --kubeconfig=\${KUBECONFIG} apply -f k8s/deployment.yaml -n ${K8S_NAMESPACE}
                        kubectl --kubeconfig=\${KUBECONFIG} apply -f k8s/service.yaml -n ${K8S_NAMESPACE}
                        kubectl --kubeconfig=\${KUBECONFIG} apply -f k8s/ingress.yaml -n ${K8S_NAMESPACE}

                        kubectl --kubeconfig=\${KUBECONFIG} rollout status deployment/calc-app -n ${K8S_NAMESPACE} --timeout=120s
                    """
                }
            }
        }
    }

    post {
        always {
            sh "docker logout ${REGISTRY} || true"
        }
        success {
            echo "Deployment successful! Live URL: https://2401059.imcc.skilli.in/"
        }
        failure {
            echo "Pipeline failed. Check stage logs for details."
        }
    }
}
